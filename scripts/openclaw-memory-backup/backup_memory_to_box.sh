#!/usr/bin/env bash
# OpenClaw (あか) memory backup to Box.com
#
# Takes a consistent SQLite snapshot of ~/.openclaw/memory/main.sqlite and
# uploads it to Box using the Client Credentials Grant (CCG) OAuth flow.
#
# Usage (cron):
#   0 * * * * /bin/bash $HOME/.openclaw/scripts/backup_memory_to_box.sh
#
# Required environment variables (typically sourced from ~/.openclaw/.env):
#   BOX_CLIENT_ID, BOX_CLIENT_SECRET, BOX_SUBJECT_ID, BOX_FOLDER_ID
# Optional:
#   BOX_SUBJECT_TYPE   (default: "user"; set to "enterprise" for Service Account auth)
#   MEMORY_DB          (default: $HOME/.openclaw/memory/main.sqlite)
#   BACKUP_DIR         (default: $HOME/.openclaw/backup)
#   LOG_FILE           (default: $BACKUP_DIR/backup.log)
#   BACKUP_RETENTION_DAYS (default: 7)

set -Eeuo pipefail

# === Defaults / config ===
MEMORY_DB="${MEMORY_DB:-$HOME/.openclaw/memory/main.sqlite}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/.openclaw/backup}"
LOG_FILE="${LOG_FILE:-$BACKUP_DIR/backup.log}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
ENV_FILE="${ENV_FILE:-$HOME/.openclaw/.env}"
LATEST_NAME="openclaw_memory_latest.sqlite"

mkdir -p "$BACKUP_DIR"

# Cumulative list of temp files; single EXIT trap cleans them all even on errors.
TEMP_FILES=()
cleanup() {
  if ((${#TEMP_FILES[@]})); then
    rm -f "${TEMP_FILES[@]}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

mktemp_tracked() {
  local f
  f="$(mktemp)"
  TEMP_FILES+=("$f")
  printf '%s' "$f"
}

log() {
  local msg
  msg="[$(date '+%Y-%m-%d %H:%M:%S%z')] $*"
  echo "$msg" >> "$LOG_FILE"
  # Also to stderr so cron MAILTO (if configured) surfaces errors.
  echo "$msg" >&2
}

die() {
  log "ERROR: $*"
  exit 1
}

on_err() {
  local exit_code=$?
  local line_no=${1:-?}
  log "ERROR: script failed at line ${line_no} (exit=${exit_code})"
  exit "$exit_code"
}
trap 'on_err $LINENO' ERR

log "=== Backup started (pid=$$) ==="

# === Prerequisite checks ===
command -v sqlite3 >/dev/null 2>&1 || die "sqlite3 is not installed (apt-get install sqlite3 or brew install sqlite)"
command -v curl >/dev/null 2>&1 || die "curl is not installed"
command -v python3 >/dev/null 2>&1 || die "python3 is not installed (used for JSON parsing)"

# === Load env ===
if [[ -f "$ENV_FILE" ]]; then
  # Warn (don't fail) if perms are too loose; secrets should be 600.
  # GNU stat (Linux) uses -c '%a', BSD stat (macOS/FreeBSD) uses -f '%Lp' for octal perms.
  if [[ "$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%Lp' "$ENV_FILE" 2>/dev/null)" != "600" ]]; then
    log "WARN: $ENV_FILE is not chmod 600 (contains secrets); run: chmod 600 $ENV_FILE"
  fi
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
fi

: "${BOX_CLIENT_ID:?BOX_CLIENT_ID is required (set in $ENV_FILE)}"
: "${BOX_CLIENT_SECRET:?BOX_CLIENT_SECRET is required}"
: "${BOX_SUBJECT_ID:?BOX_SUBJECT_ID is required}"
: "${BOX_FOLDER_ID:?BOX_FOLDER_ID is required}"
BOX_SUBJECT_TYPE="${BOX_SUBJECT_TYPE:-user}"

# === Step 1: Take a consistent SQLite snapshot ===
[[ -f "$MEMORY_DB" ]] || die "memory DB not found at $MEMORY_DB"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/openclaw_memory_${TIMESTAMP}.sqlite"
LATEST_FILE="$BACKUP_DIR/${LATEST_NAME}"

sqlite3 "$MEMORY_DB" ".backup '$BACKUP_FILE'"
# Integrity check — catches corruption early, before we ship a broken snapshot to Box.
sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q '^ok$' \
  || die "integrity_check failed for $BACKUP_FILE"
cp "$BACKUP_FILE" "$LATEST_FILE"
log "snapshot created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | awk '{print $1}'))"

# === Step 2: Acquire Box access token (Client Credentials Grant) ===
TOKEN_RESP_FILE="$(mktemp_tracked)"

HTTP_CODE=$(curl -sS -o "$TOKEN_RESP_FILE" -w '%{http_code}' \
  -X POST "https://api.box.com/oauth2/token" \
  --data-urlencode "grant_type=client_credentials" \
  --data-urlencode "client_id=${BOX_CLIENT_ID}" \
  --data-urlencode "client_secret=${BOX_CLIENT_SECRET}" \
  --data-urlencode "box_subject_type=${BOX_SUBJECT_TYPE}" \
  --data-urlencode "box_subject_id=${BOX_SUBJECT_ID}") || die "curl failed (token endpoint)"

if [[ "$HTTP_CODE" != "200" ]]; then
  die "Box token endpoint returned HTTP $HTTP_CODE: $(head -c 500 "$TOKEN_RESP_FILE")"
fi

ACCESS_TOKEN="$(python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" < "$TOKEN_RESP_FILE")"
[[ -n "$ACCESS_TOKEN" ]] || die "access_token missing in Box token response"
log "Box token acquired"

# === Step 3: Find existing 'latest' file by listing parent folder (search has propagation delay) ===
# Paginated folder listing; Box default limit is 100, max 1000.
EXISTING_FILE_ID=""
OFFSET=0
LIMIT=1000
while :; do
  LIST_RESP_FILE="$(mktemp_tracked)"
  HTTP_CODE=$(curl -sS -o "$LIST_RESP_FILE" -w '%{http_code}' \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "https://api.box.com/2.0/folders/${BOX_FOLDER_ID}/items?fields=id,name,type&limit=${LIMIT}&offset=${OFFSET}") \
    || die "curl failed (folder listing)"

  if [[ "$HTTP_CODE" != "200" ]]; then
    die "folder listing returned HTTP $HTTP_CODE: $(head -c 500 "$LIST_RESP_FILE")"
  fi

  FOUND_ID="$(LIST_JSON="$LIST_RESP_FILE" python3 - "$LATEST_NAME" <<'PY'
import json, os, sys
target = sys.argv[1]
with open(os.environ["LIST_JSON"], "r", encoding="utf-8") as f:
    data = json.load(f)
for e in data.get("entries", []):
    if e.get("type") == "file" and e.get("name") == target:
        print(e.get("id", ""))
        break
PY
)"
  TOTAL_COUNT="$(python3 -c "import sys,json; print(json.load(sys.stdin).get('total_count',0))" < "$LIST_RESP_FILE")"

  if [[ -n "$FOUND_ID" ]]; then
    EXISTING_FILE_ID="$FOUND_ID"
    break
  fi

  OFFSET=$((OFFSET + LIMIT))
  if (( OFFSET >= TOTAL_COUNT )); then
    break
  fi
done

# === Step 4: Upload (new version if exists, else create) ===
UPLOAD_RESP_FILE="$(mktemp_tracked)"
if [[ -n "$EXISTING_FILE_ID" ]]; then
  HTTP_CODE=$(curl -sS -o "$UPLOAD_RESP_FILE" -w '%{http_code}' \
    -X POST "https://upload.box.com/api/2.0/files/${EXISTING_FILE_ID}/content" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -F "attributes={\"name\":\"${LATEST_NAME}\"}" \
    -F "file=@${LATEST_FILE}") \
    || die "curl failed (upload new version)"
  ACTION="updated (file_id=${EXISTING_FILE_ID})"
else
  HTTP_CODE=$(curl -sS -o "$UPLOAD_RESP_FILE" -w '%{http_code}' \
    -X POST "https://upload.box.com/api/2.0/files/content" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -F "attributes={\"name\":\"${LATEST_NAME}\",\"parent\":{\"id\":\"${BOX_FOLDER_ID}\"}}" \
    -F "file=@${LATEST_FILE}") \
    || die "curl failed (upload new)"
  ACTION="created"
fi

if [[ "$HTTP_CODE" != "201" && "$HTTP_CODE" != "200" ]]; then
  die "Box upload returned HTTP $HTTP_CODE: $(head -c 1000 "$UPLOAD_RESP_FILE")"
fi

UPLOADED_ID="$(python3 -c "import sys,json; d=json.load(sys.stdin); e=d.get('entries',[{}]); print((e[0] if e else {}).get('id') or d.get('id','unknown'))" < "$UPLOAD_RESP_FILE" 2>/dev/null || echo "unknown")"
log "Box upload $ACTION (id=$UPLOADED_ID)"

# === Step 5: Prune old local timestamped backups ===
find "$BACKUP_DIR" -maxdepth 1 -name 'openclaw_memory_*.sqlite' \
  ! -name "$LATEST_NAME" \
  -type f -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete \
  | sed 's/^/pruned: /' | while read -r line; do log "$line"; done || true

log "=== Backup completed ==="
