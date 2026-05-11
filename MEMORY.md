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

| 呼び名 | ユニット名 | 役割 | Provider | Model | Fallback Provider | Fallback Model |
|---|---|---|---|---|---|---|
| ARIEL（アリエル） | ARIEL | Intent Parser / ツール呼び出し（OpenClaw framework, TIALA @ port 18789） | Ollama (qwen2.5:7b 相当) | ariel | anthropic | claude-3-5-haiku-20241022 |
| あか | AKA-1 | 高速 Telegram 応答・簡易照会 | anthropic | claude-3-5-haiku-20241022 | gemini | gemini-3-flash-preview |
| MAGI Monitor | magi-moni | 監視通知・パフォーマンス報告 Bot（`@magi_claw_bot`） | — | — | — | — |

### 役割分担

- **ARIEL**: 自然言語クエリを構造化 Intent JSON に変換し、ARIEL Tools 経由で BigQuery / VIX / ニュース等のデータ取得を実施。失敗時は AKA-1 (Claude Haiku) にフォールバック。
- **AKA-1（あか）**: 軽量な Q&A と簡易照会を低レイテンシで処理。`claude-3-5-haiku-20241022` を採用。ARIEL のフォールバック先も担う。
- **MAGI Monitor**: 取引結果バッファ・L4 Probation・週次/日次レポート・勝率閾値（🟢🟡🔴）通知を担当。

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
| （未命名 Haiku） | AKA-1 | 「あか」の正式ユニット化（本ドキュメント作成時） |

---

## 4. 関連ファイル

- `config/default-roles.json` — magi-sys / magi-ac の Role 定義
- `specifications/system/overview.md` — システム全体構成と Job 一覧
- `specifications/system/guard-system.md` — 7 層ガードシステム
- `specifications/system/data-schema.md` — BigQuery スキーマ
- magi-core: `intent-parser.js` — ARIEL Intent Parser 実装、Haiku フォールバック
- magi-moni: 監視通知 Bot 本体
