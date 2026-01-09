# MAGI Analytics Center (magi-ac) 詳細仕様

## 概要
- **目的**: 証券分析・投資判断システム + アルゴリズム行動予測
- **バージョン**: 7.2 (Algo Prediction System)
- **AI数**: 5つ (投資判断4 + 文書解析1) - 全て正常動作確認済み
- **デプロイ**: Cloud Run
- **URL**: https://magi-ac-398890937507.asia-northeast1.run.app
- **ポート**: 8888
- **更新日**: 2026-01-09

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

## APIエンドポイント (14個)

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

### v7.0 アルゴリズム予測 (4つ) ★NEW
```
GET  /api/algo-pattern/:symbol           アルゴパターン分析専用
POST /api/ai-consensus                   MAGI AI合議（アルゴ検知統合版）
GET  /api/algo-prediction/history/:symbol   予測履歴取得
GET  /api/algo-prediction/stats          予測統計取得
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

## Alpaca Trading API (v6.0 SDK移行完了)

### 概要
Alpaca SDK（@alpacahq/alpaca-trade-api）による完全統合。自動売買システムの注文執行を担当。

### v6.0 更新内容
- Alpaca SDKへ完全移行
- 全注文タイプ動作確認済み
- AAPL Bracket注文テスト成功

### エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | /alpaca/account | 口座情報 |
| GET | /alpaca/positions | ポジション一覧 |
| GET | /alpaca/orders | 注文一覧 |
| GET | /alpaca/quote/:symbol | リアルタイム価格 |
| POST | /alpaca/trade | 成行/指値注文 |
| POST | /alpaca/bracket | Bracket注文 |
| POST | /alpaca/oco | OCO注文 |
| POST | /alpaca/trailing-stop | Trailing Stop |
| DELETE | /alpaca/order/:orderId | 注文キャンセル |
| GET | /alpaca/calc-bracket/:price | Bracket価格計算 |

### POST /alpaca/bracket

Bracket注文（Entry + TakeProfit + StopLoss）
```json
// リクエスト
{
  "symbol": "AAPL",
  "qty": 1,
  "side": "buy",
  "take_profit": 300.50,
  "stop_loss": 277.60
}

// レスポンス
{
  "success": true,
  "order": {
    "id": "a6afbb1f-f2e8-40b5-a081-ed1e9d536752",
    "symbol": "AAPL",
    "qty": "1",
    "side": "buy",
    "type": "market",
    "order_class": "bracket",
    "status": "accepted",
    "legs": [
      {"type": "limit", "limit_price": "300.50"},
      {"type": "stop", "stop_price": "277.60"}
    ]
  }
}
```

### POST /alpaca/oco

OCO注文（One-Cancels-Other）
```json
{
  "symbol": "AAPL",
  "qty": 1,
  "side": "sell",
  "take_profit": 300.00,
  "stop_loss": 275.00
}
```

### POST /alpaca/trailing-stop

Trailing Stop注文
```json
{
  "symbol": "AAPL",
  "qty": 1,
  "side": "sell",
  "trail_percent": 3
}
```

### Secret Manager

| キー | 用途 |
|-----|------|
| ALPACA_API_KEY | APIキー |
| ALPACA_SECRET_KEY | シークレットキー |

### 口座情報
- Paper Trading: https://paper-api.alpaca.markets
- 初期残高: $100,000
- 取引時間: 24/7（Paper Trading）

---

## v7.0 アルゴリズム予測システム (Algo Prediction System)

### 概要
従来の株価予測ではなく、**市場参加者のAI/アルゴリズムの行動を予測する**という新しいアプローチ。
他のAIがどう動くかを予測し、その結果として株価を予測する。

### システムアーキテクチャ
```
市場データ → アルゴパターン検出 → 他AI行動予測 → MAGI合議 → 投資判断 → 執行
```

### 前提
- 現代の株式市場は機関投資家のAI/アルゴリズムが支配している
- 価格変動の大部分はアルゴリズム取引によって引き起こされる
- ニュースや経済指標への反応はミリ秒単位で発生する

### AI役割変更
| AI Unit | 従来の役割 | v7.0の役割 |
|---------|------------|------------|
| BALTHASAR-2 (Grok) | トレンド分析 | アルゴの群集行動予測 |
| MELCHIOR-1 (Gemini) | 財務分析 | 出来高・約定パターン分析 |
| CASPER-3 (Claude) | ESG・倫理分析 | 市場操作リスク検知 |
| SOPHIA-5 (Mistral) | リスク分析 | アルゴ同士の競合分析 |

### アルゴ検出モジュール (lib/algo-detector.js)

#### 出来高異常検出
```javascript
detectVolumeAnomaly(historicalVolumes, currentVolume)
```
- 過去30日の出来高標準偏差を計算
- 現在出来高が2σを超えた場合に異常フラグ
- 異常スコア（σ倍数）を返す

#### アルゴパターン分類
```javascript
classifyAlgoPattern(priceData, volumeAnomaly)
```

| パターン | 説明 | 検出条件 |
|----------|------|---------|
| MOMENTUM | トレンドフォロー型 | 出来高増加 + 価格が同方向に継続。移動平均を上回る。 |
| MEAN_REVERT | 平均回帰型 | RSIが30以下または70以上で反転シグナル。ボリンジャーバンド外側。 |
| BREAKOUT | ブレイクアウト型 | レジスタンス/サポート突破時の出来高急増。ATR比2倍以上の変動。 |

#### 他AI行動予測
```javascript
predictAlgoAction(algoPattern, marketData)
```

| 予測行動 | 説明 | 判定条件 |
|---------|------|---------|
| ACCUMULATE | 機関投資家による買い集め | ダークプール比率上昇、小刻みな買い注文の連続 |
| DISTRIBUTE | 機関投資家による売り抜け | 高値圏での出来高増加、段階的な売り注文 |
| HOLD | 様子見 | 明確なパターンなし |

### BigQueryテーブル: prediction_tracking_v2

#### 基本カラム（精度トラッキング）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| prediction_id | STRING | 予測ID（UUID） |
| symbol | STRING | 銘柄コード |
| predicted_at | TIMESTAMP | 予測実行日時 |
| ai_recommendation | STRING | MAGI判断（BUY/HOLD/SELL） |
| ai_confidence | FLOAT | 信頼度（0.0〜1.0） |
| entry_price | FLOAT | 予測時点の株価 |

#### アルゴ検知カラム（新規）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| volume_anomaly_score | FLOAT | 出来高異常スコア（標準偏差ベース） |
| price_reaction_ms | INTEGER | ニュース後の価格反応速度（ミリ秒） |
| algo_pattern_detected | STRING | 検出パターン（MOMENTUM/MEAN_REVERT/BREAKOUT） |
| predicted_algo_action | STRING | 予測した他AIの行動（ACCUMULATE/DISTRIBUTE/HOLD） |
| algo_confidence | FLOAT | アルゴ行動予測の確度 |
| dark_pool_ratio | FLOAT | ダークプール取引比率 |

#### 評価カラム
| カラム名 | 型 | 説明 |
|---------|-----|------|
| actual_price_1d | FLOAT | 1日後の実際価格 |
| actual_price_1w | FLOAT | 1週間後の実際価格 |
| actual_return_1d | FLOAT | 1日後リターン（%） |
| actual_return_1w | FLOAT | 1週間後リターン（%） |
| algo_prediction_correct | BOOLEAN | アルゴ行動予測的中フラグ |
| price_prediction_correct | BOOLEAN | 価格予測的中フラグ |
| evaluated_at | TIMESTAMP | 評価実行日時 |
| ai_votes | JSON | 各AIの投票詳細 |

### GET /api/algo-pattern/:symbol

アルゴリズムパターン分析専用エンドポイント。

**レスポンス例**:
```json
{
  "symbol": "NVDA",
  "timestamp": "2026-01-03T10:00:00Z",
  "currentPrice": 150.25,
  "volumeAnomaly": {
    "detected": true,
    "score": 2.5,
    "threshold": 15000000,
    "reason": "Volume is 2.5σ from average"
  },
  "algoPattern": {
    "pattern": "MOMENTUM",
    "confidence": 0.75,
    "description": "Trend-following algorithms detected: Price above moving averages with volume surge"
  },
  "predictedAction": {
    "action": "ACCUMULATE",
    "confidence": 0.75,
    "reasoning": "Momentum algos likely buying into uptrend before overbought levels"
  }
}
```

### POST /api/ai-consensus

MAGI AI合議（アルゴ検知統合版）。4つのAI（Grok, Gemini, Claude, Mistral）がアルゴ検知結果を考慮して投資判断。

**リクエスト**:
```json
{
  "symbol": "NVDA",
  "saveToDB": true
}
```

**レスポンス例**:
```json
{
  "symbol": "NVDA",
  "timestamp": "2026-01-03T10:00:00Z",
  "prediction_id": "a6afbb1f-f2e8-40b5-a081-ed1e9d536752",
  "algo_analysis": {
    "volumeAnomaly": {
      "detected": true,
      "score": 2.5,
      "reason": "Volume is 2.5σ from average"
    },
    "algoPattern": {
      "pattern": "MOMENTUM",
      "confidence": 0.75,
      "description": "Trend-following algorithms detected"
    },
    "predictedAction": {
      "action": "ACCUMULATE",
      "confidence": 0.75,
      "reasoning": "Momentum algos likely buying into uptrend"
    }
  },
  "ai_recommendations": [
    {
      "provider": "grok",
      "action": "BUY",
      "confidence": 0.80,
      "reasoning": "Other algos will chase this momentum..."
    },
    {
      "provider": "gemini",
      "action": "BUY",
      "confidence": 0.75,
      "reasoning": "Volume patterns suggest institutional accumulation..."
    },
    {
      "provider": "claude",
      "action": "HOLD",
      "confidence": 0.65,
      "reasoning": "Some manipulation risk detected..."
    },
    {
      "provider": "mistral",
      "action": "BUY",
      "confidence": 0.78,
      "reasoning": "Algo competition will drive price higher..."
    }
  ],
  "consensus": {
    "recommendation": "BUY",
    "buy": 3,
    "hold": 1,
    "sell": 0,
    "average_confidence": "0.75"
  },
  "current_price": 150.25
}
```

### GET /api/algo-prediction/history/:symbol

予測履歴を取得。

**パラメータ**:
- `days` (optional): 取得日数（デフォルト: 30）

**レスポンス例**:
```json
{
  "symbol": "NVDA",
  "days": 30,
  "count": 15,
  "history": [
    {
      "prediction_id": "...",
      "predicted_at": "2026-01-02T10:00:00Z",
      "ai_recommendation": "BUY",
      "predicted_algo_action": "ACCUMULATE",
      "actual_return_1w": 5.2,
      "algo_prediction_correct": true,
      "price_prediction_correct": true
    }
  ]
}
```

### GET /api/algo-prediction/stats

予測統計を取得。

**パラメータ**:
- `days` (optional): 集計期間（デフォルト: 30）

**レスポンス例**:
```json
{
  "days": 30,
  "stats": [
    {
      "total_predictions": 50,
      "evaluated_count": 35,
      "algo_correct_count": 23,
      "price_correct_count": 21,
      "algo_accuracy": 65.71,
      "price_accuracy": 60.00,
      "avg_return_1d": 0.8,
      "avg_return_1w": 3.2,
      "avg_buy_return": 5.1
    }
  ]
}
```

### magi-evaluator (Cloud Function)

**URL**: https://asia-northeast1-screen-share-459802.cloudfunctions.net/magi-evaluator

毎日09:00 JSTに自動実行され、過去の予測の精度を評価。

**処理フロー**:
1. 未評価の予測を取得（evaluated_at IS NULL かつ 1日以上経過）
2. 現在の株価を取得（Yahoo Finance API）
3. 1日後・1週間後のリターン計算
4. アルゴ行動予測の的中判定
5. 価格予測の的中判定
6. BigQuery prediction_tracking_v2 を更新

**判定ロジック**:
- BUY推奨 → 1週間後リターン +3%以上で的中
- SELL推奨 → 1週間後リターン -3%以下で的中
- HOLD推奨 → 1週間後リターン ±3%以内で的中

### Phase実装計画

| Phase | 期間 | 目標 | 成果物 |
|-------|------|------|--------|
| Phase 1 | 1月 | 基盤構築 | BigQueryテーブル、記録API、パターン分析 |
| Phase 2 | 2月 | アルゴ行動分析・データ蓄積 | 反応速度測定、プロンプト改修、30日分データ |
| Phase 3 | 3月 | 精度検証・本番判断 | 精度レポート、Go/No-Go判定 |

### 成功基準（本番移行判断: 3月）

| 指標 | 最低基準 | 目標値 |
|------|----------|--------|
| アルゴ行動予測精度 | 55%以上 | 65%以上 |
| 価格予測精度（1日） | 50%以上 | 60%以上 |
| データ件数 | 100件以上 | 300件以上 |
| BUY的中時平均リターン | +3%以上 | +5%以上 |
| 高ボラ銘柄Sharpe比 | 0.5以上 | 1.0以上 |

### 検証クエリ

#### 予測記録確認
```sql
SELECT prediction_id, symbol, predicted_at, ai_recommendation,
       predicted_algo_action, algo_confidence
FROM magi_ac.prediction_tracking_v2
ORDER BY predicted_at DESC LIMIT 10
```

#### アルゴ行動予測精度
```sql
SELECT
  predicted_algo_action,
  COUNT(*) as total,
  SUM(CASE WHEN algo_prediction_correct THEN 1 ELSE 0 END) as correct,
  ROUND(SUM(CASE WHEN algo_prediction_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as accuracy
FROM magi_ac.prediction_tracking_v2
WHERE evaluated_at IS NOT NULL
GROUP BY predicted_algo_action
```

#### 価格予測精度
```sql
SELECT
  ai_recommendation,
  COUNT(*) as total,
  SUM(CASE WHEN price_prediction_correct THEN 1 ELSE 0 END) as correct,
  ROUND(SUM(CASE WHEN price_prediction_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as accuracy
FROM magi_ac.prediction_tracking_v2
WHERE evaluated_at IS NOT NULL
GROUP BY ai_recommendation
```

### 実装ステータス
- ✅ Phase 1完了（1月）: 基盤構築
- ⏳ Phase 2進行中（2月）: データ蓄積
- ⏳ Phase 3予定（3月）: 精度検証


## 自動売買機能 (Auto Trading)

### 概要
- **エンドポイント**: `/api/auto-trade` (POST), `/api/auto-trade/config` (GET)
- **実行方式**: Cloud Scheduler による定期実行
- **スケジュール**: 平日 14:30-21:30 EST (NY市場時間)

### 設定
| 項目 | 値 | 説明 |
|------|-----|------|
| watchList | AAPL, NVDA, GOOGL, MSFT, TSLA | 監視銘柄 |
| qtyPerTrade | 1 | 1回の取引株数 |
| buyThreshold | 4 | BUY判断に必要なAI票数（全会一致） |
| sellThreshold | 3 | SELL判断に必要なAI票数 |

### 処理フロー
1. Cloud Scheduler がトリガー（毎時）
2. 監視銘柄ごとに4AI分析を実行
3. 投票結果を集計
4. BUY閾値達成 & 未保有 → 買い注文
5. SELL閾値達成 & 保有中 → 売り注文
6. Alpaca Paper Trading で執行

### Cloud Scheduler 設定
- **ジョブ名**: magi-auto-trade-hourly
- **リージョン**: asia-northeast1
- **認証**: OIDC (cloud-scheduler-invoker SA)
- **タイムゾーン**: America/New_York

### レスポンス例
```json
{
  "ok": true,
  "data": {
    "timestamp": "2026-01-09T04:09:11.798Z",
    "analyzed": [
      {"symbol": "AAPL", "votes": {"BUY": 2, "HOLD": 2, "SELL": 0}}
    ],
    "orders": [],
    "errors": []
  }
}
```
