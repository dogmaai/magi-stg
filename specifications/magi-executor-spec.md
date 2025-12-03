# MAGI Executor (magi-executor) 詳細仕様

## 概要
- **目的**: 自動売買注文の執行とログ記録
- **デプロイ**: Cloud Run
- **URL**: https://magi-executor-398890937507.asia-northeast1.run.app
- **ポート**: 8080
- **バージョン**: 5.0.1
- **作成日**: 2025-12-03

## 機能

### Bracket注文執行
- magi-decision からのシグナルを受信
- magi-ac の /alpaca/bracket API を呼び出し
- Entry + TakeProfit + StopLoss の3注文を同時発注

### BigQuery ログ保存
- すべての取引をtrade_logsテーブルに記録
- 注文ID、価格、信頼度、理由を保存

### 取引フロー
```
Pub/Sub trade-signals 受信
    ↓
processSignal()
    ↓
executeBracketOrder() / executeMarketOrder()
    ↓
magi-ac /alpaca/bracket 呼び出し
    ↓
Alpaca API 注文実行
    ↓
saveToTradeLog() - BigQuery保存
    ↓
Pub/Sub trade-results 発行
```

## 設定 (CONFIG)

| パラメータ | 値 | 説明 |
|-----------|-----|------|
| MAX_HISTORY | 100 | メモリ内履歴保持数 |
| BIGQUERY_DATASET | magi_analytics | データセット |
| BIGQUERY_TABLE | trade_logs | テーブル名 |

## APIエンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | /health | ヘルスチェック |
| GET | /config | 設定確認 |
| GET | /history | 取引履歴 |
| POST | /execute | 手動注文実行 |
| POST | /pubsub/trade-signal | シグナル受信 |

### POST /execute
```json
// リクエスト
{
  "symbol": "AAPL",
  "action": "BUY",
  "qty": 1,
  "brackets": {
    "entry": 286.19,
    "take_profit": 300.50,
    "stop_loss": 277.60
  }
}

// レスポンス
{
  "status": "executed",
  "symbol": "AAPL",
  "action": "BUY",
  "orderType": "bracket",
  "orderId": "a6afbb1f-f2e8-40b5-a081-ed1e9d536752",
  "executionTime": 1523
}
```

### GET /history
```json
{
  "count": 3,
  "history": [
    {
      "timestamp": "2025-12-03T05:07:06Z",
      "symbol": "MSFT",
      "action": "BUY",
      "status": "executed",
      "orderId": "ee7a0391-19bb-44eb-b820-c26ee5469684"
    }
  ]
}
```

## BigQuery テーブル

### magi_analytics.trade_logs

| カラム | 型 | 説明 |
|-------|-----|------|
| timestamp | TIMESTAMP | 実行日時 |
| symbol | STRING | 銘柄 |
| action | STRING | BUY/SELL |
| qty | INTEGER | 数量 |
| entry_price | FLOAT | エントリー価格 |
| take_profit_price | FLOAT | 利確価格 |
| stop_loss_price | FLOAT | 損切価格 |
| order_id | STRING | 注文ID |
| order_status | STRING | executed/failed |
| confidence | FLOAT | AI信頼度 |
| reason | STRING | 判断理由 |
| execution_time_ms | INTEGER | 実行時間(ms) |
| trigger | STRING | manual/pubsub |

## Pub/Sub連携

### 受信: trade-signals
```json
{
  "symbol": "AAPL",
  "action": "BUY",
  "qty": 1,
  "brackets": {
    "entry": 286.19,
    "take_profit": 300.50,
    "stop_loss": 277.60
  },
  "confidence": 0.78,
  "reason": "4AI unanimous BUY"
}
```

### 発行: trade-results
```json
{
  "symbol": "AAPL",
  "action": "BUY",
  "status": "executed",
  "orderId": "a6afbb1f-...",
  "executionTime": 1523,
  "timestamp": "2025-12-03T05:00:00Z"
}
```

## 環境変数
```
PORT=8080
GOOGLE_CLOUD_PROJECT=screen-share-459802
MAGI_AC_URL=https://magi-ac-398890937507.asia-northeast1.run.app
```

## 依存サービス

| サービス | 用途 |
|---------|------|
| magi-ac | Alpaca注文API |
| BigQuery | 取引ログ保存 |
| Pub/Sub | 結果通知 |
