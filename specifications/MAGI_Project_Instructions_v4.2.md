# MAGI System プロジェクト指示文 v4.2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
更新日: 2026-02-20
バージョン: 4.2（7層ガード命名 + コールドスタートバイパス + 思考品質分析反映）
対象: Claude、Gemini CLI、GPT-4 等のAIアシスタント
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## MAGIとは何か

**MAGI System**は、複数LLMの思考パターンと取引結果を分析し、**勝てるアルゴリズムを発見・生成する**システムである。

売買で利益を出すことが目的ではない。
**LLMがなぜその判断をしたか（思考）と、その結果（勝ち/負け）を紐付け、再現可能な勝ちパターンを抽出する**ことが目的である。

**開発者**: Jun（Dogma AI創業者）
**特性**: 非エンジニア。Google Cloud Shellでのコピペ実行が基本。完全で実行可能なコマンドを提供すること。

---

## システム構成

### Cloud Run Jobs（7つの自律取引）

| Job Name | LLM Provider | Model | Unit Name | スケジュール(UTC) |
|---|---|---|---|---|
| magi-core-job | Mistral | mistral-small-latest | SOPHIA-5 | 14:30 月-金 |
| magi-core-gemini | Google | gemini-2.0-flash | MELCHIOR-1 | 15:00 月-金 |
| magi-core-groq | Groq | llama-3.3-70b-versatile | ANIMA | 16:00 月-金 |
| magi-core-deepseek | DeepSeek | deepseek-chat | CASPER | 17:00 月-金 |
| magi-core-qwen | Qwen | qwen-plus | QWEN | 18:00 月-金 |
| magi-core-xai | xAI | grok-2 | BALTHASAR | 19:00 月-金 |
| magi-core-together | Together | Llama-4-Maverick-17B | ORACLE | 19:30 月-金 |

### Cloud Run Services

| Service | URL | 用途 |
|---|---|---|
| magi-stg | magi-stg-398890937507.asia-northeast1.run.app | 仕様管理 |
| magi-mcp | magi-mcp-398890937507.asia-northeast1.run.app | MCP連携 |
| magi-moni | magi-moni-398890937507.asia-northeast1.run.app | モニタリング |
| magi-price-tracker | magi-price-tracker-398890937507.asia-northeast1.run.app | 価格追跡 |

---

## 7層ガードシステム

| Layer | 名称 | 条件 | 動作 |
|---|---|---|---|
| L1 | データ検証層 | side/qty/symbol が NULL | 注文拒否 |
| L2 | 確信度層 | confidence < 19.7% | 注文拒否 |
| L3 | 銘柄除外層 | GOOGL, IWM | 注文拒否 |
| L4 | 方向適性層 | win_rate <= 30% かつ loses >= 3 | 方向別ブロック |
| L5 | パターン判定層 | winProb < 49.0% | ブロック |
| L6 | VIX防御層 | VIX > 35 時 | BUY禁止 |
| L7 | 総合判定層 | 複合スコア < 67.4 | ブロック |

### L7 複合スコア公式

score = 0.309 * directionWR + 0.369 * symbolWR + 0.173 * confidence + 0.149 * reasoningScore

閾値: 67.4（Optuna 1000-trial最適化）
コールドスタートバイパス: 評価済み取引10件未満のLLMはL7をスキップ

---

## 発見済みパターン

| LLM + 方向 | 勝率 | 戦績 | 状態 |
|---|---|---|---|
| Groq BUY | 100% | 12W 0L | 許可 |
| Mistral SELL | 100% | 4W 0L | 許可 |
| Together SELL | 90% | 20W 2L | 許可 |
| Together BUY | 22.7% | 5W 17L | ブロック |
| Groq SELL | 25% | 1W 3L | ブロック |

### シンボル選択性

- META (88.9%), MSFT (100%), AAPL (68.4%) → 強い
- GOOGL (0%), IWM → 除外
- NVDA (50%) → 要モニタリング

---

## LLM別思考品質

| LLM | 思考品質 | embedding分析有効性 | 最適な制御方法 |
|---|---|---|---|
| xAI (BALTHASAR) | 高 | 高 | ISABEL embedding |
| Qwen (QWEN) | 高 | 中 | reasoning長フィルター |
| Mistral (SOPHIA-5) | 中 | 高 | ISABEL + キーワード |
| DeepSeek (CASPER) | 中 | 低 | L4 方向適性層 |
| Groq (ANIMA) | 低 | 低 | L4 方向適性層 |
| Google (MELCHIOR-1) | 低〜中 | 低 | データ品質修正が先 |

---

## 技術スタック

- GCPプロジェクト: screen-share-459802
- リージョン: asia-northeast1
- BigQuery: magi_core（USリージョン）
- 取引: Alpaca Paper Trading（$100k仮想資金）
- 分析: Cohere（ISABEL、embed/rerank）
- 通知: Telegram

## GCP重要制約

- Cloud Run: --no-allow-unauthenticated 強制
- Identity Token: TOKEN=$(gcloud auth print-identity-token)
- package.json start: "node bootstrap.js"（server.jsではない）
- EADDRINUSE: pkill -f "npm start" で解消

---

## 開発チーム

| AI | 役割 |
|---|---|
| Claude | PM/Architect |
| Mistral Vibe | CLI Coder |
| Gemini CLI | Implementation |

---

## ゴール

LLMの思考パターンから、再現可能な勝てるアルゴリズムを発見する。
売買の利益は副産物。本質はパターン発見である。

---

Document Version: 4.2
Status: Active
Last Updated: 2026-02-20

