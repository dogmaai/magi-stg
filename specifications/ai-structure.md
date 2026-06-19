# MAGI System AI構成仕様書
## バージョン: 1.1
## 更新日: 2026-05-11

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
| **MELCHIOR-1** | Gemini | gemini-3-flash-preview | 論理的・数値分析 | magi-sys, magi-ac |
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
| **HERMES機関** | （統合ゲートウェイ） | — | ニュース／センチメント／VIX 統合 | magi-core |
| **ANIMA** | Together | Llama-3.3-70B-Instruct-Turbo | バックアップ・合議補助 | magi-ac |
| **ORACLE**（HERMES:ORACLE） | Ollama @ TIALA | qwen2.5:14b | VIX レジーム／Symbol VIX 解析 | magi-core (HERMES サブモジュール) |

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

保存先: ECHIDNA — BigQuery magi_analytics.document_vectors
```

#### HERMES機関 — ニュース・センチメント・VIX 統合ゲートウェイ

PLM の事前情報収集を統合化する Cloud Run 製ゲートウェイ。`magi-core/src/hermes.js` として実装。
4 つのサブモジュールから成る:

| サブモジュール | データソース | 書き込み先 BQ テーブル | 起動方式 |
|---|---|---|---|
| **HERMES:BRAVE** | Brave Search + Gemini gemini-3-flash-preview スコアリング | `magi_core.pre_trade_intelligence` | PLM 起動時 / Cloud Scheduler |
| **HERMES:ALPHA_VANTAGE** | Alpha Vantage NEWS_SENTIMENT API（リアルタイム） | — (直接 PLM プロンプト注入) | オンデマンド |
| **HERMES:MARKET_RESEARCH** | `magi_core.market_research` テーブル（読み取り） | — (リーダー) | PLM 起動時 |
| **HERMES:ORACLE** | Ollama @ TIALA を Tailscale Funnel 経由で呼び出し | `magi_core.market_indicators`, `magi_analytics_us.vix_comparison` | Cloud Run Job `magi-vix-oracle` (Cloud Scheduler `magi-vix-premarket`, 現状 UTC 固定 13:00 / 14:00 月-金 premarket。ET 換算は DST で変動: EDT 期 09:00/10:00 ET・EST 期 08:00/09:00 ET) |

書き手と読み手の関係:

- **書き手**: HERMES の各サブモジュール（`sentiment-monitor.js` / `magi-vix-oracle` Cloud Run ジョブ）
- **読み手**: PLM セッションが `ask_market_context()` / `getOracleVixContext()` 経由で BigQuery から読み込み、プロンプトに注入

`investment_decision: false`（HERMES 自身は投資判断をしない）

##### 旧仕様（v1.0 廃止）

初版 (2026-01-09) では HERMES = Groq `llama-3.3-70b-versatile` の緊急アラート (~500ms, `/api/alert/groq`) として定義していたが、当該エンドポイントは実装されず、現行は上記の統合インテリジェンスゲートウェイとして再定義した。

#### ANIMA（Together）- バックアップ
```
機能:
- 他AIのフォールバック
- 追加分析（必要時）
- 合議補助

状態: 設定済み・待機中
investment_decision: false
```

#### ORACLE（HERMES:ORACLE / Ollama @ TIALA）- VIX 専門 LLM

```
機能:
- VIX レジーム解析（CALM / NORMAL / FEAR / PANIC など）
- 銘柄別 Symbol VIX スコアリング（src/isabel.js calculateSymbolVix）
- BigQuery market_indicators, vix_comparison への書き込み

実行場所: TIALA (Mac mini M4 16GB Unified) 上の Ollama (port 11434)
エンドポイント: lib/vix.js callOracleOllama() → OLLAMA_BASE_URL (Tailscale Funnel)
投入経路: Cloud Run Job magi-vix-oracle (Cloud Scheduler magi-vix-premarket)
起動時刻: 現状 UTC 固定 13:00 / 14:00 月-金（premarket）。ET 換算は DST で変動: EDT 期 09:00/10:00 ET・EST 期 08:00/09:00 ET。時刻基準は `America/New_York`(NYSE 09:30-16:00 ET)
読み手: PLM セッションが getOracleVixContext() で読み込み
investment_decision: false
```

注: 旧仕様 (v1.0) では ORACLE は `magi-agent` (Gemini 3) の会話形投資アドバイザーとして記載されていたが、現行では HERMES の VIX サブモジュール（Ollama）に置き換わった。`magi-agent` 自体は別途存続。

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

[市場インテリジェンス収集]
     │
     ├─── Brave Search ─┐
     ├─── Alpha Vantage ┼──▶ HERMES機関 (magi-core/src/hermes.js)
     ├─── BQ market_research ┤        │
     └─── Ollama @ TIALA ────┘        │ BQ書き込み
                                       ▼
                       ECHIDNA / BigQuery
                                 (pre_trade_intelligence,
                                  market_research,
                                  market_indicators,
                                  vix_comparison)
                                       │
                                       │ PLM 起動時に読み出し
                                       ▼
                                 4AI 投資判断
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
| 2026-05-11 | 1.1 | HERMES と ORACLE を現行実装（magi-core/src/hermes.js, magi-vix-oracle, TIALA Ollama）に合わせて更新。旧 Groq HERMES と magi-agent ORACLE の記述を廃止扱いとして残置 |

---

Document Version: 1.0
Author: Claude (PM/Architect)
