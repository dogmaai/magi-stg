# MAGI Analytics Center (magi-ac) 詳細仕様

## 概要

- **目的**: 証券分析・投資判断システム
- **AI数**: 5つ (投資判断4 + 文書解析1)
- **デプロイ**: Cloud Run
- **ポート**: 8888

## AI構成

### 投資判断AI (4つ)

#### Unit-B2 (Grok) - 創造的トレンド分析
- **視点**: 新興市場、ゲームチェンジャー発見
- **判断**: イノベーション力、市場将来性
- **Output**: BUY/HOLD/SELL + 信頼度 + 理由

#### Unit-M1 (Gemini) - 論理的数値分析
- **視点**: PER, ROE, 財務指標、バリュエーション
- **判断**: 財務健全性、収益成長率
- **Output**: BUY/HOLD/SELL + 信頼度 + 理由

#### Unit-C3 (Claude) - 人間的価値分析
- **視点**: ブランド価値、企業文化、ESG
- **判断**: 社会的責任、長期持続可能性
- **Output**: BUY/HOLD/SELL + 信頼度 + 理由

#### Unit-R4 (Mistral) - 実践的リスク分析
- **視点**: リスク・リターン、ポートフォリオ適合性
- **判断**: ボラティリティ、分散投資効果
- **Output**: BUY/HOLD/SELL + 信頼度 + 理由

### 文書解析AI (1つ)

#### ISABEL (Cohere) - 文書解析・情報抽出
- **機能1**: 決算書解析（財務数値の自動抽出）
- **機能2**: ニュース記事のセンチメント分析
- **機能3**: 長文レポートの要約
- **機能4**: RAG（文書ベース質問応答）
- **Model**: command-r-plus / command-r

## データソース

### Yahoo Finance API
- リアルタイム株価
- 財務データ (PER, EPS, 時価総額)
- 収益性指標
- 負債比率

### BigQuery
- 時系列データ分析
- 過去価格履歴
- 統計情報

### Cloud Storage
- 分析結果の保存・アーカイブ

## APIエンドポイント

### 株価分析 (6つ)
- GET  /health
- POST /api/analyze
- GET  /api/analytics/latest/:symbol
- GET  /api/analytics/history/:symbol
- GET  /api/analytics/stats/:symbol
- POST /api/admin/init-bigquery

### 文書解析 (3つ)
- POST /api/document/analyze
- POST /api/document/sentiment
- POST /api/document/summarize

## 環境変数
```
PORT=8888
GOOGLE_CLOUD_PROJECT=screen-share-459802
MISTRAL_BASE_URL=https://api.mistral.ai/v1
XAI_BASE_URL=https://api.x.ai/v1
```

## Secret Manager
```
XAI_API_KEY
GEMINI_API_KEY
ANTHROPIC_API_KEY
MISTRAL_API_KEY
COHERE_API_KEY
```
