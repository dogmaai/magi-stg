# Cloud Run Job カタログ

## 取引Jobss（7つのLLM）

| Job名 | Provider | モデル | ユニット | スケジュール(UTC) |
|---|---|---|---|---|
| magi-core-job | Mistral | mistral-small-latest | SOPHIA-5 | 14:30 月-金 |
| magi-core-gemini | Google | gemini-2.5-flash | MELCHIOR-1 | 15:00 月-金 |
| magi-core-groq | Groq | llama-3.3-70b-versatile | ANIMA | 16:00 月-金 |
| magi-core-deepseek | DeepSeek | deepseek-chat | CASPER | 17:00 月-金 |
| magi-core-qwen | Qwen | qwen-plus | MINERVA | 18:00 月-金 |
| magi-core-xai | xAI | grok-4-1-fast | BALTHASAR | 19:00 月-金 |
| magi-core-together | Together | Llama-4-Maverick-17B-128E-Instruct-FP8 | ORACLE | 19:30 月-金 |

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