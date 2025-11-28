# MAGI Analytics Center (magi-ac) 詳細仕様

## 概要
- **目的**: 証券分析・投資判断システム
- **AI数**: 5つ (投資判断4 + 文書解析1)
- **デプロイ**: Cloud Run
- **URL**: https://magi-ac-398890937507.asia-northeast1.run.app
- **ポート**: 8888
- **更新日**: 2025-11-26

## AI構成

### 投資判断AI (4つ)

#### Unit-B2 (Grok) - 創造的トレンド分析
- **Model**: grok-2-latest
- **視点**: 新興市場、ゲームチェンジャー発見
- **判断**: イノベーション力、市場将来性
- **Output**: BUY/HOLD/SELL + 信頼度 + 理由

#### Unit-M1 (Gemini) - 論理的数値分析
- **Model**: gemini-2.0-flash-exp
- **視点**: PER, ROE, 財務指標、バリュエーション
- **判断**: 財務健全性、収益成長率
- **Output**: BUY/HOLD/SELL + 信頼度 + 理由

#### Unit-C3 (Claude) - 人間的価値分析
- **Model**: claude-sonnet-4-20250514
- **視点**: ブランド価値、企業文化、ESG
- **判断**: 社会的責任、長期持続可能性
- **Output**: BUY/HOLD/SELL + 信頼度 + 理由

#### Unit-R4 (Mistral) - 実践的リスク分析
- **Model**: mistral-large-latest
- **視点**: リスク・リターン、ポートフォリオ適合性
- **判断**: ボラティリティ、分散投資効果
- **Output**: BUY/HOLD/SELL + 信頼度 + 理由

### 文書解析AI (1つ)

#### ISABEL (Cohere) - 文書解析・情報抽出
- **Model**: command-r-08-2024
- **機能1**: 決算書解析（財務数値の自動抽出）
- **機能2**: ニュース記事のセンチメント分析
- **機能3**: 長文レポートの要約
- **保存先**: BigQuery + Cloud Storage

## テクニカル分析

### 指標一覧
| 指標 | 期間 | シグナル |
|-----|------|---------|
| RSI | 14期間 | <30: OVERSOLD, >70: OVERBOUGHT |
| MACD | 12/26/9 | Line > Signal: BULLISH |
| Bollinger Bands | 20期間 | 上限超: OVERBOUGHT, 下限割: OVERSOLD |

### データソース
- **Yahoo Finance API** (yahoo-finance2 v3)
  - リアルタイム株価
  - 財務データ (PER, EPS, 時価総額)
  - 過去60日の価格履歴

## APIエンドポイント (10個)

### テクニカル分析 (3つ)
```
GET  /health                    ヘルスチェック
POST /api/analyze               テクニカル分析
GET  /api/technical/:symbol     テクニカル分析(GET)
```

### 4AI合議投資判断 (3つ)
```
POST /api/ai-consensus          4AI並列分析 + BigQuery保存
GET  /api/history/:symbol       分析履歴取得
GET  /api/history/detail/:id    AI判断詳細取得
```

### Cohere文書解析 (4つ)
```
POST /api/document/extract-financials  財務数値抽出 + Storage保存
POST /api/document/sentiment           センチメント分析 + Storage保存
POST /api/document/summarize           文書要約 + Storage保存
GET  /api/document/history/:symbol     文書解析履歴取得
```

## BigQuery統合

### データセット: magi_ac

#### analysesテーブル（4AI合議結果）
| カラム | 型 | 説明 |
|-------|-----|------|
| analysis_id | STRING | 一意ID |
| symbol | STRING | 銘柄コード |
| company_name | STRING | 会社名 |
| analyzed_at | TIMESTAMP | 分析日時 |
| stock_price | FLOAT | 株価 |
| market_cap | FLOAT | 時価総額 |
| pe_ratio | FLOAT | PER |
| final_recommendation | STRING | BUY/HOLD/SELL |
| final_analysis | STRING | 合議結果JSON |

#### ai_judgmentsテーブル（個別AI判断）
| カラム | 型 | 説明 |
|-------|-----|------|
| judgment_id | STRING | 一意ID |
| analysis_id | STRING | 親分析ID |
| ai_provider | STRING | grok/gemini/claude/mistral |
| magi_unit | STRING | Unit-B2等 |
| action | STRING | BUY/HOLD/SELL |
| confidence | INTEGER | 信頼度(0-100) |
| reasoning | STRING | 判断理由 |
| judged_at | TIMESTAMP | 判断日時 |

#### document_analysesテーブル（文書解析結果）
| カラム | 型 | 説明 |
|-------|-----|------|
| analysis_id | STRING | 一意ID |
| symbol | STRING | 銘柄コード |
| analysis_type | STRING | sentiment/financials/summary |
| result_json | STRING | 解析結果JSON |
| storage_path | STRING | gs://パス |
| created_at | TIMESTAMP | 作成日時 |

## Cloud Storage

### バケット: gs://magi-documents/
- 文書解析の元テキストを保存
- パス形式: `{symbol}/{analysis_type}/{analysis_id}.txt`
- 500文字以上のテキストのみ保存

## 環境変数
```
PORT=8888
GOOGLE_CLOUD_PROJECT=screen-share-459802
```

## Secret Manager
```
XAI_API_KEY        - Grok API
GEMINI_API_KEY     - Gemini API
ANTHROPIC_API_KEY  - Claude API
MISTRAL_API_KEY    - Mistral API
COHERE_API_KEY     - Cohere API
```

## 使用例

### 4AI合議投資判断
```bash
TOKEN=$(gcloud auth print-identity-token)
curl -X POST "https://magi-ac-398890937507.asia-northeast1.run.app/api/ai-consensus" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL"}'
```

### センチメント分析
```bash
curl -X POST "https://magi-ac-398890937507.asia-northeast1.run.app/api/document/sentiment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","text":"Apple reported record iPhone sales..."}'
```

### 履歴取得
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://magi-ac-398890937507.asia-northeast1.run.app/api/history/AAPL"
```

## コスト最適化
- **min-instances=0**: コールドスタート3-5秒、月額$5以下
- **min-instances=1**: 即時応答、月額$70程度

## 完成度: 100%

---

## 機関投資家分析機能 (IAA - Institutional Activity Analyzer)

### 概要
機関投資家による株価操作の兆候を検出・分析する機能。

### エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/institutional/analyze | 操作分析 |
| GET | /api/institutional/watchlist | 監視リスト取得 |
| POST | /api/institutional/watchlist | 監視リスト追加 |
| GET | /api/institutional/alerts | アラート一覧 |

### 検出可能なパターン

| パターン | 説明 | 閾値 |
|---------|------|------|
| volume_spike | 出来高スパイク | 平均の3倍以上 |
| closing_manipulation | 終値操作 | 終値前15分の異常変動 |
| high_dark_pool | ダークプール集中 | 50%以上 |
| short_pressure | 空売り圧力 | 40%超が3日連続 |
| painting_the_tape | 小口連続取引 | 10回以上連続 |
| wash_trading | ウォッシュトレード | 同一価格大量取引 |

### データソース

| ソース | 取得データ | 更新頻度 |
|--------|----------|---------|
| Yahoo Finance | 株価・出来高 | リアルタイム |
| SEC EDGAR | 13F報告書 | 四半期 |
| FINRA | 空売りデータ | 日次 |
| FINRA ADF | ダークプール | 週次 |

### レスポンス例
```json
{
  "symbol": "AAPL",
  "manipulation_score": 0.81,
  "signals": [
    {
      "type": "high_dark_pool_activity",
      "severity": "high",
      "description": "ダークプール取引が全体の56.3%を占める"
    }
  ],
  "institutional_activity": {
    "flow_direction": "bearish",
    "recent_13f_holdings": [...]
  },
  "alerts": [...]
}
```

### BigQuery保存

| テーブル | 内容 |
|---------|------|
| manipulation_signals | 操作シグナル履歴 |
| institutional_positions | 機関投資家ポジション |


---

## AI株価予測機能 (APP - AI Price Predictor)

### 概要
4AIによる株価予測機能。短期から長期まで対応。

### エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/predict | 株価予測 |

### リクエスト
```json
{
  "symbol": "AAPL",
  "horizon": "1day",
  "enableAI": true,
  "saveToDB": true
}
```

### 予測期間 (horizon)

| 値 | 期間 | 重視データ |
|----|------|-----------|
| 1day | 1日後 | テクニカル指標、機関動向 |
| 1week | 1週間後 | テクニカル、センチメント |
| 1month | 1ヶ月後 | テクニカル、決算予想 |
| 3months | 3ヶ月後 | 決算、セクタートレンド、マクロ |
| 2years | 2年後 | ファンダメンタルズ、成長率、競争優位性 |

### レスポンス例
```json
{
  "symbol": "AAPL",
  "horizon": "3months",
  "current_price": 136.78,
  "prediction": {
    "predicted_price": 155.00,
    "direction": "UP",
    "confidence": 0.72,
    "price_range": { "low": 148.00, "high": 162.00 }
  },
  "ai_predictions": {
    "grok": { "predicted_price": 158.00, "direction": "UP", "confidence": 0.75, "reasoning": "..." },
    "gemini": { "predicted_price": 152.00, "direction": "UP", "confidence": 0.70, "reasoning": "..." },
    "claude": { "predicted_price": 156.00, "direction": "UP", "confidence": 0.73, "reasoning": "..." },
    "mistral": { "predicted_price": 154.00, "direction": "UP", "confidence": 0.68, "reasoning": "..." }
  },
  "factors": [
    "テクニカル: RSI 55（中立）",
    "機関動向: やや売り圧力",
    "ファンダメンタルズ: 成長継続"
  ]
}
```

### BigQuery保存

| テーブル | 内容 |
|---------|------|
| predictions | 予測結果 |
| prediction_accuracy | 予測精度（事後検証） |

### 実装ステータス
- [ ] 未実装（設計完了）


---

## AI株価予測機能 (APP - AI Price Predictor)

### 概要
4AIによる株価予測機能。短期から長期まで対応。

### エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/predict | 株価予測 |

### リクエスト
```json
{
  "symbol": "AAPL",
  "horizon": "1day",
  "enableAI": true,
  "saveToDB": true
}
```

### 予測期間 (horizon)

| 値 | 期間 | 重視データ |
|----|------|-----------|
| 1day | 1日後 | テクニカル指標、機関動向 |
| 1week | 1週間後 | テクニカル、センチメント |
| 1month | 1ヶ月後 | テクニカル、決算予想 |
| 3months | 3ヶ月後 | 決算、セクタートレンド、マクロ |
| 2years | 2年後 | ファンダメンタルズ、成長率、競争優位性 |

### レスポンス例
```json
{
  "symbol": "AAPL",
  "horizon": "3months",
  "current_price": 136.78,
  "prediction": {
    "predicted_price": 155.00,
    "direction": "UP",
    "confidence": 0.72,
    "price_range": { "low": 148.00, "high": 162.00 }
  },
  "ai_predictions": {
    "grok": { "predicted_price": 158.00, "direction": "UP", "confidence": 0.75, "reasoning": "..." },
    "gemini": { "predicted_price": 152.00, "direction": "UP", "confidence": 0.70, "reasoning": "..." },
    "claude": { "predicted_price": 156.00, "direction": "UP", "confidence": 0.73, "reasoning": "..." },
    "mistral": { "predicted_price": 154.00, "direction": "UP", "confidence": 0.68, "reasoning": "..." }
  },
  "factors": [
    "テクニカル: RSI 55（中立）",
    "機関動向: やや売り圧力",
    "ファンダメンタルズ: 成長継続"
  ]
}
```

### BigQuery保存

| テーブル | 内容 |
|---------|------|
| predictions | 予測結果 |
| prediction_accuracy | 予測精度（事後検証） |

### 実装ステータス
- [ ] 未実装（設計完了）


---

## AI株価予測機能 (APP - AI Price Predictor)

### 概要
4AIによる株価予測機能。短期から長期まで対応。

### エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/predict | 株価予測 |

### リクエスト
```json
{
  "symbol": "AAPL",
  "horizon": "1day",
  "enableAI": true,
  "saveToDB": true
}
```

### 予測期間 (horizon)

| 値 | 期間 | 重視データ |
|----|------|-----------|
| 1day | 1日後 | テクニカル指標、機関動向 |
| 1week | 1週間後 | テクニカル、センチメント |
| 1month | 1ヶ月後 | テクニカル、決算予想 |
| 3months | 3ヶ月後 | 決算、セクタートレンド、マクロ |
| 2years | 2年後 | ファンダメンタルズ、成長率、競争優位性 |

### レスポンス例
```json
{
  "symbol": "AAPL",
  "horizon": "3months",
  "current_price": 136.78,
  "prediction": {
    "predicted_price": 155.00,
    "direction": "UP",
    "confidence": 0.72,
    "price_range": { "low": 148.00, "high": 162.00 }
  },
  "ai_predictions": {
    "grok": { "predicted_price": 158.00, "direction": "UP", "confidence": 0.75, "reasoning": "..." },
    "gemini": { "predicted_price": 152.00, "direction": "UP", "confidence": 0.70, "reasoning": "..." },
    "claude": { "predicted_price": 156.00, "direction": "UP", "confidence": 0.73, "reasoning": "..." },
    "mistral": { "predicted_price": 154.00, "direction": "UP", "confidence": 0.68, "reasoning": "..." }
  },
  "factors": [
    "テクニカル: RSI 55（中立）",
    "機関動向: やや売り圧力",
    "ファンダメンタルズ: 成長継続"
  ]
}
```

### BigQuery保存

| テーブル | 内容 |
|---------|------|
| predictions | 予測結果 |
| prediction_accuracy | 予測精度（事後検証） |

### 実装ステータス
- [ ] 未実装（設計完了）


---

## AI株価予測機能 (APP - AI Price Predictor)

### 概要
4AIによる株価予測機能。短期から長期まで対応。

### エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/predict | 株価予測 |

### リクエスト
```json
{
  "symbol": "AAPL",
  "horizon": "1day",
  "enableAI": true,
  "saveToDB": true
}
```

### 予測期間 (horizon)

| 値 | 期間 | 重視データ |
|----|------|-----------|
| 1day | 1日後 | テクニカル指標、機関動向 |
| 1week | 1週間後 | テクニカル、センチメント |
| 1month | 1ヶ月後 | テクニカル、決算予想 |
| 3months | 3ヶ月後 | 決算、セクタートレンド、マクロ |
| 2years | 2年後 | ファンダメンタルズ、成長率、競争優位性 |

### レスポンス例
```json
{
  "symbol": "AAPL",
  "horizon": "3months",
  "current_price": 136.78,
  "prediction": {
    "predicted_price": 155.00,
    "direction": "UP",
    "confidence": 0.72,
    "price_range": { "low": 148.00, "high": 162.00 }
  },
  "ai_predictions": {
    "grok": { "predicted_price": 158.00, "confidence": 0.75, "reasoning": "..." },
    "gemini": { "predicted_price": 152.00, "confidence": 0.70, "reasoning": "..." },
    "claude": { "predicted_price": 156.00, "confidence": 0.73, "reasoning": "..." },
    "mistral": { "predicted_price": 154.00, "confidence": 0.68, "reasoning": "..." }
  }
}
```

### BigQuery保存

| テーブル | 内容 |
|---------|------|
| predictions | 予測結果 |
| prediction_accuracy | 予測精度検証 |

### 実装ステータス: 未実装（設計完了）

