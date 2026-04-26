# MAGI System - セッション引継ぎタスク管理

最終更新: 2026-04-26
更新者: Claude (PM/Architect)

---

## セッション開始プロトコル

Junが以下をセッション冒頭に実行してClaudeに貼り付ける：

    cat ~/magi-stg/specifications/session-tasks.md

---

## 現在のシステム状態

- magi-stg /public/specs: 正常 (200 OK, count:14)
- 9 LLM Jobs (うち稼働 6 + PAUSED 2 + JOB-ONLY 1)
- ISABEL L1-L5: 実装済み
- Optuna: 週次実行中
- VIX-Correlated Watchlist Framework: Phase 1 PoC 稼働中（TIARA 対象、2026-04-26〜）

---

## 完了済みタスク（最近）

- [x] Watchlist Integration Phase 1 (TIARA PoC) 完了 (2026-04-26) — PR #50 マージ、Cloud Run デプロイ完了、watchlist 20 銘柄ロード動作確認 (`[watchlist] Loaded 20 symbols from BQ` ログ確認済)
- [x] Gemini Deep Research v2 で米国株監視銘柄 20 銘柄取得 (2026-04-26) — 4 カテゴリ A/B/C/D = 7/5/5/3、BQ `magi_core.market_research` に投入済
- [x] 仕様書のユニット名整合性整理 (2026-04-26) — MINERVA→LILITH、BALTHASAR→ZEROEL、CHERUB→PROMETHEUS、TIARA / PROMETHEUS / SERAPH 追加
- [x] constitution.md v2.2 リリース (2026-04-26) — VIX-CORRELATED WATCHLIST FRAMEWORK セクション追加、TIARA / LILITH ユニット定義追加
- [x] magi-stg 500エラー修正 (2026-03-31) — bootstrap.js 追加、package.json 修正
- [x] embed gap 解消 — sync_embeddings.mjs、867件中 199 件 embed 完了
- [x] session-tasks.md 作成・運用開始 (2026-03-31)

---

## 進行中・残タスク

### 高優先度

- [ ] **Watchlist Phase 1 観察** (2026-04-27〜2026-05-04): TIARA が watchlist 銘柄を取引対象に選択するか BQ `trades_active` で監視
````
  bq query --use_legacy_sql=false --project_id=screen-share-459802 \
  'SELECT DATE(timestamp) AS date, symbol, side, reason
   FROM `screen-share-459802.magi_core.trades_active`
   WHERE unit_name = "TIARA"
     AND symbol IN ("COST","MCD","PEP","PG","JNJ","KO","WMT","AVGO","CRM","MA","V","ORCL","SPXS","SQQQ","SDS","PSQ","SOXS","MU","JPM","XOM")
     AND timestamp >= TIMESTAMP("2026-04-26")
   ORDER BY timestamp DESC'
````

- [ ] **Watchlist Phase 2 判断** (2026-05-04 頃): 良好なら他 5 PLM (SOPHIA-5 / MELCHIOR-1 / CASPER / ANIMA / LILITH) へ展開

- [ ] magi-stg deploy.yml の `--allow-unauthenticated` を `--no-allow-unauthenticated` に修正（APM へ依頼）

- [ ] sync_embeddings.mjs の Cloud Scheduler 自動化（Method A、Cloud Run Job 経由）

### 中優先度

- [ ] **Watchlist Phase 3 実装**: 月次自動更新 Job (`magi-watchlist-updater`) 実装
  - 前提: Gemini Deep Research API allowlist 承認 (Case #69959756)
  - スケジュール: 毎月 1 日 03:00 UTC (12:00 JST)
  - データ: NDJSON 検証 + ETF sentiment "N/A"→"neutral" 等の自動修正

- [ ] SonarQube Major issue 修正 (`magi-core.js` L1489 "Unexpected lexical declaration in case block") — Phase 2 リファクタ時に併せて対応

- [ ] sonar-project.properties 改善 — `lib/__tests__/` のテストパスがカバレッジ計測に含まれていない問題を修正

- [ ] OpenClaw でログインできないアプリの問題調査（詳細未確認）

- [ ] MooMoo Phase 2（取引実行）— 150trades + Optuna 再最適化後に着手

- [ ] Cloud Run Job timeout 拡張判断 — `magi-core-ollama` の現在 300 秒で稀に timeout する。手動実行で発生確認 (2026-04-26)。Scheduler 経由の自動実行は通常 180 秒 attemptDeadline 内で完了しているため、過去 8/10 回成功

### 低優先度

- [ ] Grafana ダッシュボード拡張（Symbol VIX ヒートマップ、LLM コスト）
- [ ] TablePlus BigQuery 接続
- [ ] ZEROEL / PROMETHEUS のコスト判断（PAUSED / JOB-ONLY のまま放置するか復活させるか）
- [ ] SERAPH (Kimi) の Job 作成判断

---

## 次回セッション時の確認事項

1. **2026-04-28 (火) 朝**: 4/27 (月) 20:30 UTC の Scheduler 自動実行が成功したか
```bash
   gcloud run jobs executions list --job=magi-core-ollama --region=asia-northeast1 --project=screen-share-459802 --limit=3 --format='table(name,creationTimestamp,status.conditions[0].status)'
```
2. **同朝**: 自動実行ログに `[watchlist] Loaded 20 symbols from BQ` が出ているか
3. **2026-05-04 頃**: Watchlist Phase 2 展開判断 (上記の高優先度タスク参照)

---

## ルール

- セッション開始時: Jun が `cat ~/magi-stg/specifications/session-tasks.md` を実行して内容を Claude に貼り付ける
- セッション終了時: Claude が更新内容を出力 → Jun または APM が GitHub push する
- Cloud Run デプロイは Jun が Cloud Shell で手動実行（APM / Devin / Claude は実行しない）
- Cloud Shell ヒアドキュメント絶対禁止（A32）— Python 置換または `cloudshell edit` で別ファイル化
- `--set-secrets` は毎回全シークレット列挙が必要（上書きされる）
- BigQuery `bq` コマンドは `--project_id` フラグ（`--project` ではない）

---

## メモ: TIARA Watchlist Phase 1 デプロイ詳細 (2026-04-26)

参考用に、今回のデプロイで使った正確なコマンドを記録しておく:

```bash
gcloud run jobs deploy magi-core-ollama \
  --source=. \
  --region=asia-northeast1 \
  --project=screen-share-459802 \
  --task-timeout=300s \
  --cpu=1 \
  --memory=512Mi \
  --max-retries=0 \
  --parallelism=1 \
  --tasks=1 \
  --service-account=398890937507-compute@developer.gserviceaccount.com \
  --set-env-vars="LLM_PROVIDER=ollama" \
  --set-secrets="ALPACA_API_KEY=ALPACA_API_KEY:latest,ALPACA_SECRET_KEY=ALPACA_SECRET_KEY:latest,OLLAMA_BASE_URL=OLLAMA_BASE_URL:latest,TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN:latest,TELEGRAM_CHAT_ID=TELEGRAM_CHAT_ID:latest"
```

注意点:
- `Dockerfile` (拡張子なし、116 bytes) が repo 直下に存在し、`--source=.` で自動使用される
- `OLLAMA_BASE_URL` は Secret Manager 経由 (Tailscale Funnel URL `https://aka.aegean-boa.ts.net/v1/chat/completions`)
- `UNIT_NAME` / `OLLAMA_MODEL` は env 不要（コード側で `LLM_PROVIDER=ollama` から自動解決）
