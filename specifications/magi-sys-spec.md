# MAGI System (magi-sys) 詳細仕様

## 概要

- **目的**: 質問応答・合議システム
- **AI数**: 5つ
- **デプロイ**: Cloud Run
- **ポート**: 8080

## AI構成

### BALTHASAR-2 (Grok / xAI)
- **役割**: 創造的・革新的分析
- **Model**: grok-2-latest
- **Temperature**: 0.5
- **得意**: トレンド予測、イノベーション分析

### MELCHIOR-1 (Gemini / Google)
- **役割**: 論理的・科学的分析
- **Model**: gemini-2.0-flash-exp
- **Temperature**: 0.2
- **得意**: データ分析、科学的検証

### CASPER-3 (Claude / Anthropic)
- **役割**: 人間的・感情的分析
- **Model**: claude-sonnet-4-20250514
- **Temperature**: 0.4
- **得意**: 倫理判断、長期的影響分析

### MARY-4 (GPT-4 / OpenAI)
- **役割**: 統合的・バランス分析 + Judge (裁定者)
- **Model**: gpt-4o-mini
- **Temperature**: 0.3
- **得意**: 意見統合、コンセンサス形成
- **特別**: 最終判断・統合を担当

### SOPHIA-5 (Mistral / Mistral AI)
- **役割**: 実践的・戦略的分析
- **Model**: mistral-large-latest
- **Temperature**: 0.3
- **得意**: 戦略立案、リスク評価

## 合議モード

### 1. Consensus Mode (多数決)
5つのAIの意見 → 最も多い回答を採用

### 2. Integration Mode (統合)
5つのAIの意見 → GPT-4が統合 → 最終回答

### 3. Synthesis Mode (創発)
5つのAIの意見 → 新しい洞察を創造 → 創発的回答

## APIエンドポイント

- GET  /health - ヘルスチェック
- GET  /status - 5つのAPIキー確認
- POST /api/consensus - 質問応答（5 AI合議）
- POST /api/grok/ping - Grok接続確認

## 環境変数
```
PORT=8080
ANTHROPIC_MODEL=claude-sonnet-4-20250514
GEMINI_MODEL=gemini-2.0-flash-exp
XAI_MODEL=grok-2-latest
OPENAI_MODEL=gpt-4o-mini
MISTRAL_MODEL=mistral-large-latest
```

## Secret Manager
```
OPENAI_API_KEY
GEMINI_API_KEY
ANTHROPIC_API_KEY
XAI_API_KEY
MISTRAL_API_KEY
```
