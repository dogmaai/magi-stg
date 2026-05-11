# MAGI System Memory — Agents & Roles

最終更新: 2026-05-11

本ドキュメントは MAGI システム全体で動作するエージェント（LLM ユニット / 連携ボット）を一覧化し、ユーザー側の認識（呼び名）とシステム実装の対応関係を明確化するためのリファレンスです。

---

## 1. エージェント一覧

### 1.1 取引判断 PLM（5AI Q&A / 4AI 証券分析）

| 呼び名 | ユニット名 | サービス | Provider | Model | Fallback |
|---|---|---|---|---|---|
| バルタザール | BALTHASAR-2 | magi-sys | grok | grok-2-latest | mistral / mistral-large-latest |
| メルキオール | MELCHIOR-1 | magi-sys | gemini | gemini-3-flash-preview | openai / gpt-4o-mini |
| カスパー | CASPER-3 | magi-sys | anthropic | claude-sonnet-4-20250514 | gemini / gemini-3-flash-preview |
| メアリー | MARY-4 | magi-sys | openai | gpt-4o-mini | anthropic / claude-sonnet-4-20250514 |
| ソフィア | SOPHIA-5 | magi-sys | mistral | mistral-large-latest | grok / grok-2-latest |
| Unit-B2 / Unit-M1 / Unit-C3 / Unit-R4 / ISABEL | — | magi-ac | grok / gemini / anthropic / mistral / cohere | — | — |

詳細は `config/default-roles.json` を参照。

### 1.2 自律取引 LLM Jobs（PLM）

| Job 名 | ユニット名 | Provider | 状態 |
|---|---|---|---|
| magi-core-job | SOPHIA-5 | Mistral | ACTIVE |
| magi-core-gemini | MELCHIOR-1 | Google Gemini | ACTIVE |
| magi-core-groq | ANIMA | Groq | ACTIVE |
| magi-core-deepseek | CASPER | DeepSeek | ACTIVE |
| magi-core-qwen | LILITH | Qwen (Alibaba) | ACTIVE |
| magi-core-xai | ZEROEL | xAI | PAUSED |
| magi-core-together | ORACLE | Together | PAUSED |
| magi-core-openai | PROMETHEUS | OpenAI | JOB-ONLY |
| magi-core-ollama | TIARA | Ollama @ TIALA | ACTIVE |

詳細は `specifications/system/overview.md` を参照。

---

## 2. Telegram 連携エージェント

Telegram 経由で人間との対話・通知を担当するエージェント群。取引判断は行わない。

| 呼び名 | ユニット名 | 役割 | Provider | Model | 接続経路 |
|---|---|---|---|---|---|
| あか | AKA-1 | Telegram 自然文 Q&A / 簡易照会（**tool calling で BQ 直接照会**） | anthropic | claude-3-5-haiku-20241022 | `magi-moni` の `/webhook/telegram` で非 slash メッセージを処理 |
| MAGI Monitor | magi-moni | 監視通知・slash コマンド・週次/日次レポート Bot（`@magi_claw_bot`） | — | — | `/webhook/telegram` の slash 分岐 + Cloud Scheduler |
| ARIEL（アリエル） | ARIEL | Intent Parser / ツール呼び出し（**Telegram 経路では未使用**） | Ollama (qwen2.5:7b 相当) | ariel | OpenClaw (Claude Desktop) → `magi-gateway/ask` のみ |

### 役割分担

- **AKA-1（あか）= Telegram の顔**: 自然文を受けて `magi-moni` 内で `claude-3-5-haiku-20241022` を tool calling で呼び、事前定義済みの読み取り専用 BQ ツール (`get_today_trades`, `get_winrate_by_llm`, `get_daily_summary`, `get_l4_probation`) で応答する。`TELEGRAM_CHAT_ID` と一致する chat のみ応答。
- **MAGI Monitor**: slash コマンド (`/status`, `/wr`, `/jobs`, `/today`, `/help`) と Cloud Scheduler 駆動の日次/週次レポート（取引結果バッファ・L4 Probation・勝率閾値🟢🟡🔴 通知）を担当。
- **ARIEL** は Telegram には繋がっていない。OpenClaw (Mac mini 上の Claude Desktop 系クライアント) から `magi-gateway` の `/ask` 経由で呼ばれる用途専用。Ollama Modelfile `ariel` を qwen2.5:7b ベースで運用。

### 設計選択の経緯

2026-05-11 の議論で「Intent Parser + UI Chat の 2 段構成 (ARIEL → AKA-1)」と「単一 LLM + tool calling (AKA-1 のみ)」を比較。後者を採用した理由:

- 商用 LLM (Haiku) の tool calling 精度が `qwen2.5:7b` を上回る
- 会話文脈の保持が単一 LLM の方が安定する
- レイヤー数が減り障害点・デバッグ箇所が減る
- TIALA Ollama の負荷を ARIEL 分削減でき、TIARA PLM / HERMES:ORACLE と競合しにくい

ARIEL は OpenClaw 経由のローカル CLI 用途として残す。

---

## 3. ユニット名の命名規則と改名履歴

### 命名規則

- **PLM ユニット名**: エヴァンゲリオン由来（BALTHASAR / MELCHIOR / CASPER / SOPHIA / MARY）+ サフィックス番号、または独自神話系（ANIMA / LILITH / ZEROEL / ORACLE / PROMETHEUS / TIARA）。
- **Telegram 連携**: 短く呼びやすい固有名（ARIEL / AKA-1）。
- **ハードウェア**: 末尾 LA（TIALA = Mac mini M4 ホスト）。
- **PLM (Ollama 上)**: 末尾 RA（TIARA = qwen2.5:14b の PLM ユニット名）。
  - **L/R 1 文字違い、混同厳禁**。

### 改名履歴

| 改名前 | 改名後 | 備考 |
|---|---|---|
| MINERVA | LILITH | qwen-plus PLM |
| BALTHASAR | ZEROEL | xAI |
| CHERUB | PROMETHEUS | OpenAI |
| （未命名 Haiku） | AKA-1 | 「あか」の正式ユニット化（2026-05-11 magi-moni に接続） |

---

## 4. 関連ファイル

- `config/default-roles.json` — magi-sys / magi-ac の Role 定義
- `specifications/system/overview.md` — システム全体構成と Job 一覧
- `specifications/system/guard-system.md` — 7 層ガードシステム
- `specifications/system/data-schema.md` — BigQuery スキーマ
- `specifications/system/tiala-architecture.md` — TIALA ハードウェア内部構成図（Mermaid）
- magi-core: `intent-parser.js` — ARIEL Intent Parser 実装（OpenClaw 経由）、Haiku フォールバック
- magi-moni: `server.js` — `/webhook/telegram` で AKA-1 (Haiku + tool calling) と slash コマンドを処理する Telegram Bot 本体
- magi-gateway: `intent-parser.js` / `openclaw.yaml` — OpenClaw → ARIEL 経路のゲートウェイ
