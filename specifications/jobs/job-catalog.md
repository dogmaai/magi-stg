# Cloud Run Job カタログ

最終更新: 2026-04-26

## 取引Jobs（9つのLLMユニット）

| Job名 | Provider | モデル | ユニット | スケジュール(UTC) | 状態 |
|---|---|---|---|---|---|
| magi-core-job | Mistral | mistral-small-latest | SOPHIA-5 | 14:30 月-金 | ACTIVE |
| magi-core-gemini | Google Gemini | gemini-2.5-flash | MELCHIOR-1 | 15:00 月-金 | ACTIVE |
| magi-core-groq | Groq | llama-3.3-70b-versatile | ANIMA | 16:00 月-金 | ACTIVE |
| magi-core-deepseek | DeepSeek | deepseek-chat | CASPER | 17:00 月-金 | ACTIVE |
| magi-core-qwen | Qwen (Alibaba) | qwen-plus | LILITH | 18:00 月-金 | ACTIVE |
| magi-core-xai | xAI | grok-4-1-fast | ZEROEL | 19:00 月-金 | PAUSED |
| magi-core-together | Together | Llama-4-Maverick-17B-128E-Instruct-FP8 | ORACLE | 19:30 月-金 | PAUSED |
| magi-core-openai | OpenAI | gpt-4o-mini | PROMETHEUS | (Scheduler 未作成) | JOB-ONLY |
| magi-core-ollama | Ollama @ TIALA | qwen2.5:14b | TIARA | 20:30 月-金 | ACTIVE |

### Scheduler 命名規則の不整合に関する注記

| Scheduler 名 | 対応 Job |
|---|---|
| magi-scheduler-mistral / -gemini / -groq / -deepseek / -qwen / -xai / -together | 各 PLM Job (パターン: `magi-scheduler-{provider}`) |
| **magi-core-ollama-scheduler** | magi-core-ollama (例外的命名) |

### ユニット名の改名履歴

| 改名前 | 改名後 | 備考 |
|---|---|---|
| MINERVA | LILITH | qwen-plus PLM |
| BALTHASAR | ZEROEL | xAI |
| CHERUB | PROMETHEUS | OpenAI |

### 未稼働ユニット

| ユニット | Provider | 状態 |
|---|---|---|
| SERAPH | Kimi | config登録済・Job未作成 |

## ユーティリティJobs

| Job名 | 役割 | スケジュール(UTC) | リポジトリ |
|---|---|---|---|
| magi-evaluator | 取引結果判定 | 毎日 10:00 | magi-core |
| magi-vix-oracle | VIX取得・BigQuery書き込み | 13:00 / 14:00 月-金 | magi-core |
| magi-gemini-analyzer | Geminiパターン分析 | 14:00 月-金 | magi-core |
| magi-isabel-briefing | ISABELブリーフィング | 13:30 月-金 | magi-ac |
| magi-isabel-l4-scheduler | L4パターン言語化 | 13:00 月-金 | magi-ac |
| magi-optuna-optimizer | Optuna最適化 | 毎週月曜 06:00 | magi-core |
| magi-sync-embeddings | Embedding同期 | 毎日 11:00 | magi-core |
| magi-fred-updater | 経済指標更新 | 毎日 02:00 | fred_integration |
| magi-model-health-check | LLM死活監視 | 毎月1日 00:00 | magi-core |
| magi-market-briefing | 市場ブリーフィング | 随時 | magi-core |

## 計画中の Jobs（2026-04-26 時点で未作成）

| Job名 | 役割 | 投入予定時期 | 備考 |
|---|---|---|---|
| magi-watchlist-updater | VIX-Correlated Watchlist 月次自動更新 | Gemini Deep Research API allowlist 承認後 | 毎月1日 03:00 UTC |

## デプロイ方法

全Jobはmagi-coreリポジトリからCloud Buildでデプロイ。
Junが手動でCloud Shellから実行。AIエージェントはdeployコマンドを実行しない。

```bash
# 例：単一Jobデプロイ
cd ~/magi-core && gcloud run jobs deploy [JOB_NAME] \
  --source=. \
  --region=asia-northeast1 \
  --project=screen-share-459802
```

### TIARA (magi-core-ollama) デプロイ時の注意

- Dockerfile は repo 直下の `Dockerfile`（116 bytes）を使用（`Dockerfile.ollama` を別途使う必要なし、`--source=.` で自動検出）
- `--set-secrets` は毎回全シークレット列挙が必要（上書きされるため）
  - `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` / `OLLAMA_BASE_URL` / `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`
- `--set-env-vars="LLM_PROVIDER=ollama"` のみ必要（UNIT_NAME / OLLAMA_MODEL はコード側で自動解決）
- リソース: cpu=1, memory=512Mi, timeout=300s, parallelism=1, max-retries=0
- Service account: 398890937507-compute@developer.gserviceaccount.com
