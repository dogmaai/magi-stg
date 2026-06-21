# OpenClaw (あか) memory backup → Box

Periodically snapshots the OpenClaw Telegram bot's long-term memory
(`~/.openclaw/memory/main.sqlite`) and uploads it to a Box folder using the
Box Client Credentials Grant (CCG) OAuth flow.

## Files

| File | Purpose |
| --- | --- |
| `backup_memory_to_box.sh` | Main backup script. Takes a SQLite snapshot, auths to Box, uploads as a new version of `openclaw_memory_latest.sqlite`, prunes old local backups. |
| `.env.example` | Template for `~/.openclaw/.env` (credentials). |

Only the script lives in this repo — it is deployed by copying it onto the
"あか" server. Credentials never leave the server.

## Prerequisites (on the あか server)

```bash
which sqlite3 curl python3   # all three must be present
# If sqlite3 is missing:
#   Debian/Ubuntu: sudo apt-get install -y sqlite3
#   macOS:         brew install sqlite
```

## Box side (one-time setup, manual)

1. Box Developer Console → **Create a Custom App** → **Server Authentication (Client Credentials Grant)**.
2. Ask a Box admin to **authorize** the app (Admin Console → Apps → Custom Apps Manager).
3. Grab `Client ID`, `Client Secret`, and the **User ID** (or Enterprise ID if you prefer Service Account auth) of the account that should own the uploads.
4. Create the destination folder in Box and copy its folder ID from the URL.

## Install on the server

```bash
# 1. Drop the script in place
mkdir -p ~/.openclaw/scripts
cp scripts/openclaw-memory-backup/backup_memory_to_box.sh ~/.openclaw/scripts/
chmod +x ~/.openclaw/scripts/backup_memory_to_box.sh

# 2. Configure credentials
cp scripts/openclaw-memory-backup/.env.example ~/.openclaw/.env
chmod 600 ~/.openclaw/.env
${EDITOR:-vi} ~/.openclaw/.env   # fill in BOX_CLIENT_ID / _SECRET / _SUBJECT_ID / _FOLDER_ID

# 3. Dry-run once to verify
bash ~/.openclaw/scripts/backup_memory_to_box.sh
tail -n 50 ~/.openclaw/backup/backup.log
```

If the dry-run succeeds you should see `Box upload created (id=…)` and the
file `openclaw_memory_latest.sqlite` in the target Box folder.

## Cron (hourly)

```bash
(crontab -l 2>/dev/null; echo "0 * * * * /bin/bash $HOME/.openclaw/scripts/backup_memory_to_box.sh") | crontab -
crontab -l | grep backup_memory_to_box
```

The script is idempotent: each run uploads a **new version** of the same Box
file (`openclaw_memory_latest.sqlite`), so Box's file-version history acts as
your time-machine. Local timestamped snapshots in `~/.openclaw/backup/` older
than `BACKUP_RETENTION_DAYS` (default 7) are auto-pruned.

## Quick-and-dirty test with a Developer Token

If you just want to validate the Box upload path before provisioning the
Custom App, grab a 60-minute Developer Token from the Box Console and run:

```bash
export BOX_ACCESS_TOKEN=your_developer_token
export BOX_FOLDER_ID=your_folder_id
sqlite3 ~/.openclaw/memory/main.sqlite ".backup /tmp/openclaw_memory_backup.sqlite"
curl -X POST "https://upload.box.com/api/2.0/files/content" \
  -H "Authorization: Bearer $BOX_ACCESS_TOKEN" \
  -F "attributes={\"name\":\"openclaw_memory_backup.sqlite\",\"parent\":{\"id\":\"${BOX_FOLDER_ID}\"}}" \
  -F "file=@/tmp/openclaw_memory_backup.sqlite"
```

## Differences from the original draft (review notes)

- **Fail-fast everywhere**: every `curl` is checked for HTTP status, and failures log the response body before exiting (`set -Eeuo pipefail` + `trap ... ERR`).
- **Folder listing instead of search**: Box's `/search` has several-minutes of indexing lag, so the very first run after upload would double-create. We page `/folders/{id}/items` instead (deterministic, immediate).
- **`PRAGMA integrity_check`** on the fresh snapshot before upload — catches corruption early instead of shipping a broken DB to Box.
- **`.env` permission check**: warns if `~/.openclaw/.env` isn't `chmod 600`.
- **Required-var validation** via `: "${VAR:?...}"` — fails loudly instead of silently POSTing empty credentials.
- **`--data-urlencode`** for the token request — avoids breakage if a client secret contains `&` / `=`.
- **Temp files via `mktemp`** + cleanup trap, and logs include PID and timezone offset so overlapping cron runs and TZ-shifted logs are diagnosable.
