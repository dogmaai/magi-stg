# MAGI System AI構成仕様書
## バージョン: 1.0
## 更新日: 2026-01-09

---

## 概要

MAGI Systemは**9つのAI**で構成され、役割ごとに明確に分離されています。

---

## AI構成サマリー

| カテゴリ | AI数 | 投資判断参加 |
|---------|------|-------------|
| 投資判断チーム | 4 | ✅ 参加 |
| 統合Judge | 1 | ❌ 判断のみ |
| 専門AI | 4 | ❌ 不参加 |
| **合計** | **9** | - |

---

## 投資判断チーム（4 AI）

投資判断に**直接参加**するAI。BUY/HOLD/SELLを投票。

| ユニット | プロバイダー | モデル | 役割 | 使用サービス |
|----------|-------------|--------|------|-------------|
| **BALTHASAR-2** | Grok (xAI) | grok-2-latest | 創造的・トレンド分析 | magi-sys, magi-ac |
| **MELCHIOR-1** | Gemini | gemini-2.0-flash-exp | 論理的・数値分析 | magi-sys, magi-ac |
| **CASPER-3** | Claude | claude-sonnet-4-20250514 | 人間的・ESG分析 | magi-sys, magi-ac |
| **SOPHIA-5** | Mistral | mistral-large-latest | 戦略的・リスク分析 | magi-sys, magi-ac |

### 投票ルール
- BUY閾値: 4票（全会一致）
- SELL閾値: 3票以上
- 信頼度最低: 70%

---

## 統合Judge（1 AI）

投資判断には**参加しない**。4AIの意見を統合・裁定。

| ユニット | プロバイダー | モデル | 役割 | 使用サービス |
|----------|-------------|--------|------|-------------|
| **MARY-4** | OpenAI | gpt-4o-mini | 統合・裁定 | magi-sys |

### 役割詳細
- 4AIの投票結果を受けて最終判断
- Consensus/Integrationモードで使用
- `investment_decision: false`

---

## 専門AI（4 AI）

投資判断には**参加しない**。それぞれ専門機能を提供。

| ユニット | プロバイダー | モデル | 役割 | 使用サービス |
|----------|-------------|--------|------|-------------|
| **ISABEL** | Cohere | command-r-plus | 文書解析・RAG | magi-ac |
| **HERMES** | Groq | llama-3.3-70b-versatile | 緊急アラート（~500ms） | magi-ac |
| **ANIMA** | Together | Llama-3.3-70B-Instruct-Turbo | バックアップ・合議補助 | magi-ac |
| **ORACLE** | Gemini 2.0 | gemini-2.0-flash-exp | 投資アドバイザーAgent | magi-agent |

### 各専門AIの詳細

#### ISABEL（Cohere）- 文書解析・RAG
```
機能:
- 決算報告書の要約・分析
- ニュースセンチメント分析
- SEC Filing（10-K, 10-Q, 8-K）解析
- ベクトル埋め込み・検索
- RAGベースの質問応答

データソース:
- Alpaca News API（15分毎）
- Google News RSS（毎日）
- SEC EDGAR（毎日）

保存先: BigQuery magi_analytics.document_vectors
```

#### HERMES（Groq）- 緊急アラート
```
機能:
- 高速応答（目標500ms以下）
- 緊急市場変動の検知
- リアルタイムアラート生成

エンドポイント: POST /api/alert/groq
investment_decision: false
```

#### ANIMA（Together）- バックアップ
```
機能:
- 他AIのフォールバック
- 追加分析（必要時）
- 合議補助

状態: 設定済み・待機中
investment_decision: false
```

#### ORACLE（magi-agent）- 投資アドバイザー
```
機能:
- 会話形式の投資アドバイス
- 銘柄クイック分析
- 銘柄比較
- セクター分析

サービス: magi-agent（別サービス）
URL: https://magi-agent-398890937507.asia-northeast1.run.app
```

---

## 処理フロー図
```
┌─────────────────────────────────────────────────────────────────────┐
│                         MAGI System AI フロー                        │
└─────────────────────────────────────────────────────────────────────┘

[情報収集]
     │
     ├─── Alpaca News ──────┐
     ├─── Google News ──────┼──▶ ISABEL (Cohere) ──▶ BigQuery
     └─── SEC EDGAR ────────┘         │
                                      │ インサイト提供
                                      ▼
[投資判断]
     │
     ├─── BALTHASAR-2 (Grok) ────┐
     ├─── MELCHIOR-1 (Gemini) ───┼──▶ 4AI投票 ──▶ MARY-4 (統合)
     ├─── CASPER-3 (Claude) ─────┤
     └─── SOPHIA-5 (Mistral) ────┘
                                      │
                                      ▼
[取引執行]
     │
     └──▶ magi-decision ──▶ magi-executor ──▶ Alpaca

[緊急対応]
     │
     └──▶ HERMES (Groq) ──▶ 高速アラート（~500ms）

[ユーザー対話]
     │
     └──▶ ORACLE (magi-agent) ──▶ 会話形式アドバイス
```

---

## LLMプロバイダー設定

設定場所: magi-stg `/public/llm-config`

| プロバイダー | APIキー（Secret Manager） | enabled |
|-------------|--------------------------|---------|
| Grok (xAI) | XAI_API_KEY | ✅ |
| Gemini | GEMINI_API_KEY | ✅ |
| Claude | ANTHROPIC_API_KEY | ✅ |
| OpenAI | OPENAI_API_KEY | ✅ |
| Mistral | MISTRAL_API_KEY | ✅ |
| Cohere | COHERE_API_KEY | ✅ |
| Groq | GROQ_API_KEY | ✅ |
| Together | TOGETHER_API_KEY | ✅ |

---

## 自動売買での使用AI

`/api/auto-trade` で呼び出されるAI:
```javascript
// auto-trade.js
getGrokRecommendation()    // BALTHASAR-2 ✅
getGeminiRecommendation()  // MELCHIOR-1  ✅
getClaudeRecommendation()  // CASPER-3    ✅
getMistralRecommendation() // SOPHIA-5    ✅

// 専門AIは不参加
// ISABEL, HERMES, ANIMA, ORACLE は投資判断に参加しない
```

---

## バージョン履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2026-01-09 | 1.0 | 初版作成。9AI構成を明文化 |

---

Document Version: 1.0
Author: Claude (PM/Architect)
