# MAGI System v4.3 概要

最終更新: 2026-04-26

## 目的

LLMの思考パターンと取引結果を紐付け、再現可能な勝ちパターンを発見する。
売買の利益は副産物。本質はパターン発見。

## アーキテクチャ

```
[9つのLLM自律取引Jobs (うち稼働 6 + PAUSED 2 + JOB-ONLY 1)]
        ↓
[7層ガードシステム (MAGI v4.3)]
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

| Job名 | Provider | ユニット名 | スケジュール(UTC) | 状態 |
|---|---|---|---|---|
| magi-core-job | Mistral | SOPHIA-5 | 14:30 月-金 | ACTIVE |
| magi-core-gemini | Google Gemini | MELCHIOR-1 | 15:00 月-金 | ACTIVE |
| magi-core-groq | Groq | ANIMA | 16:00 月-金 | ACTIVE |
| magi-core-deepseek | DeepSeek | CASPER | 17:00 月-金 | ACTIVE |
| magi-core-qwen | Qwen (Alibaba) | LILITH | 18:00 月-金 | ACTIVE |
| magi-core-xai | xAI | ZEROEL | 19:00 月-金 | PAUSED |
| magi-core-together | Together | ORACLE | 19:30 月-金 | PAUSED |
| magi-core-openai | OpenAI | PROMETHEUS | (Scheduler 未作成) | JOB-ONLY |
| **magi-core-ollama** | **Ollama @ TIALA** | **TIARA** | **20:30 月-金** | **ACTIVE** |

### ユニット名の改名履歴

| 改名前 | 改名後 | 備考 |
|---|---|---|
| MINERVA | LILITH | qwen-plus PLM |
| BALTHASAR | ZEROEL | xAI |
| CHERUB | PROMETHEUS | OpenAI |

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

## VIX-Correlated Watchlist Framework（2026-04-26 追加）

VIX 値とリターンの相関を事前リサーチした 20 銘柄/4 カテゴリの「取引候補プール」。
PLM 起動時に BigQuery `magi_core.market_research` から最新 watchlist を読み込み、プロンプトに注入。

| 項目 | 値 |
|---|---|
| 初回投入日 | 2026-04-26 |
| 銘柄数 | 20 |
| カテゴリ数 | 4 (A: defensive, B: growth, C: inverse ETF, D: cyclical) |
| データソース | Gemini Deep Research v2 |
| BQ テーブル | `screen-share-459802.magi_core.market_research` (research_type='watchlist_vix') |
| Phase 1 PoC 対象 | TIARA |
| Phase 2 (展開判断) | 観察 1 週間後（2026-05-04 頃） |
| Phase 3 (月次自動化) | Gemini Deep Research API allowlist 承認後 |

詳細は `constitution.md` の "VIX-CORRELATED WATCHLIST FRAMEWORK" セクションを参照。

## インフラ

- Cloud Run Jobs: asia-northeast1
- BigQuery: magi_core (US region)
- Secret Manager: 12+ APIキー
- Grafana: https://aka.grafana.net
- ARIEL: Mac mini M4 (Tailscale: 100.114.185.1) — Intent Parser、取引判断しない
- **TIALA: Mac mini M4 16GB Unified (Tailscale: 100.114.185.1) — TIARA の推論実行ハードウェア (port 11434)**

注: TIALA はハードウェア名（末尾LA）、TIARA は PLM ユニット名（末尾RA）。L/R 1 文字違い、混同厳禁。
