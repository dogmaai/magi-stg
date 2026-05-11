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
- **TIALA (ハードウェア): Mac mini M4 16GB Unified、Jun 自宅、Tailscale IP 100.114.185.1**。同一ホスト上で以下のサービスが稼働:
  - **TIARA** (port 11434): Ollama 推論 PLM (qwen2.5:14b)。HERMES:ORACLE / TIARA PLM Job / ARIEL（OpenClaw 経路）の 3 コンシューマーが共有
  - **ARIEL** (port 18789): OpenClaw 経由の Intent Parser、取引判断しない。**Telegram 経路では未使用** (OpenClaw / Claude Desktop 専用)
  - moomoo-bridge.py (port 11436): MooMoo 連携 (Phase 2 用)
  - OpenClaw proxy (port 11435)
- **AKA-1（あか）= Telegram の顔**: `magi-moni` の `/webhook/telegram` で非 slash メッセージを受け取り、`claude-3-5-haiku-20241022` を tool calling で呼んで BigQuery を直接照会し応答する。読み取り専用事前定義ツール: `get_today_trades`, `get_winrate_by_llm`, `get_daily_summary`, `get_l4_probation`。`magi-sys` の Role として `config/default-roles.json` にも登録（ARIEL 失敗時のフォールバック先）。

注: TIALA はハードウェア名（末尾LA）、TIARA は PLM ユニット名（末尾RA）。L/R 1 文字違い、混同厳禁。

TIALA 上のサービス/ポート/外部接続の詳細（Mermaid 図）は `specifications/system/tiala-architecture.md` を参照。

### Telegram 連携エージェントの役割分担

| エージェント | 役割 | Provider / Model | 接続経路 |
|---|---|---|---|
| **AKA-1（あか）** | Telegram 自然文 Q&A / 簡易照会（tool calling で BQ 直接照会） | Anthropic (`claude-3-5-haiku-20241022`) | `magi-moni` の `/webhook/telegram` で非 slash メッセージを処理 |
| **MAGI Monitor** (`magi-moni` / `@magi_claw_bot`) | slash コマンド・週次/日次レポート・勝率閾値通知 | — | `/webhook/telegram` の slash 分岐 + Cloud Scheduler |
| ARIEL | Intent Parser / ツール呼び出し（**Telegram 経路では未使用**） | Ollama (`ariel` / qwen2.5:7b 相当) | OpenClaw → `magi-gateway/ask` のみ |

Telegram 上では **AKA-1 が単一 LLM + tool calling で応答し、ARIEL（Intent Parser）は介さない** 設計。ARIEL は OpenClaw 経由のローカル CLI 用途として残す。選択理由は `MEMORY.md` 「設計選択の経緯」を参照。
