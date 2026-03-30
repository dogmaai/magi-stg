# MAGI System v4.2 概要

## 目的

LLMの思考パターンと取引結果を紐付け、再現可能な勝ちパターンを発見する。
売買の利益は副産物。本質はパターン発見。

## アーキテクチャ

```
[7つのLLM自律取引Jobs]
        ↓
[7層ガードシステム]
        ↓
[Alpaca Paper Trading ($100k仮想)]
        ↓
[BigQuery データ蓄積]
        ↓
[ISABEL パターン分析 (Cohere)]
        ↓
[Gemini Pattern Analysis (毎日)]
        ↓
[Optuna 自動最適化 (週次)]
```

## LLMユニット一覧

| Job名 | Provider | ユニット名 | スケジュール(UTC) |
|---|---|---|---|
| magi-core-job | Mistral | SOPHIA-5 | 14:30 月-金 |
| magi-core-gemini | Google | MELCHIOR-1 | 15:00 月-金 |
| magi-core-groq | Groq | ANIMA | 16:00 月-金 |
| magi-core-deepseek | DeepSeek | CASPER | 17:00 月-金 |
| magi-core-qwen | Qwen | MINERVA | 18:00 月-金 |
| magi-core-xai | xAI | BALTHASAR | 19:00 月-金 |
| magi-core-together | Together | ORACLE | 19:30 月-金 |

## ユーティリティJobs

| Job名 | 役割 | スケジュール(UTC) |
|---|---|---|
| magi-evaluator | 取引結果判定 | 毎日 10:00 |
| magi-vix-oracle | VIX取得・分析 | 13:00 / 14:00 月-金 |
| magi-gemini-analyzer | Geminiパターン分析 | 14:00 月-金 |
| magi-isabel-briefing | ISABELブリーフィング | 13:30 月-金 |
| magi-optuna-optimizer | Optuna最適化 | 毎週月曜 06:00 |
| magi-sync-embeddings | Embedding同期 | 毎日 11:00 |
| magi-fred-updater | 経済指標更新 | 毎日 02:00 |
| magi-model-health-check | LLM死活監視 | 毎月1日 00:00 |

## インフラ

- Cloud Run Jobs: asia-northeast1
- BigQuery: magi_core (US region)
- Secret Manager: 12+ APIキー
- Grafana: https://aka.grafana.net
- ARIEL: Mac mini M4 (Tailscale: 100.114.185.1)