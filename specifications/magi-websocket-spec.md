# MAGI WebSocket (magi-websocket) 詳細仕様

## 概要
- **目的**: リアルタイム価格監視とPub/Sub発行
- **デプロイ**: Cloud Run
- **URL**: https://magi-websocket-398890937507.asia-northeast1.run.app
- **ポート**: 8080
- **バージョン**: 1.2.0
- **方式**: REST APIポーリング（60秒間隔）
- **作成日**: 2025-12-03

## 機能

### 価格監視
- magi-acの `/alpaca/quote/:symbol` を定期ポーリング
- 5銘柄をデフォルト監視: AAPL, NVDA, MSFT, GOOGL, AMZN
- 価格変動0.5%以上でPub/Sub発行

### Pub/Sub連携
- トピック: `price-updates`
- 価格変動検知時に自動発行
- magi-decisionへPush配信

## 設定 (CONFIG)

| パラメータ | 値 | 説明 |
|-----------|-----|------|
| PRICE_CHANGE_THRESHOLD | 0.5 | 発行閾値(%) |
| POLLING_INTERVAL | 60000 | ポーリング間隔(ms) |
| BATCH_DELAY | 500 | 銘柄間待機(ms) |

## APIエンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | /health | ヘルスチェック |
| GET | /config | 設定・状態確認 |
| POST | /start | ポーリング開始 |
| POST | /stop | ポーリング停止 |
| POST | /poll | 手動ポーリング（1回） |
| POST | /watchlist | 監視銘柄更新 |
| POST | /test-publish | テスト発行 |

### POST /poll
```json
// レスポンス
{
  "status": "polled",
  "successCount": 5,
  "lastPrices": {
    "AAPL": 283.07,
    "NVDA": 86.35,
    "MSFT": 486.73,
    "GOOGL": 316.78,
    "AMZN": 234.97
  }
}
```

### POST /watchlist
```json
// リクエスト
{"symbols": ["AAPL", "TSLA", "META"]}

// レスポンス
{"status": "updated", "watchlist": ["AAPL", "TSLA", "META"]}
```

## Pub/Sub発行形式
```json
{
  "symbol": "AAPL",
  "price": 290.00,
  "change_pct": 2.5,
  "timestamp": "2025-12-03T06:16:57.926Z",
  "source": "magi-websocket-polling"
}
```

## 環境変数
```
PORT=8080
GOOGLE_CLOUD_PROJECT=screen-share-459802
```

## サービスアカウント
- `magi-trading-sa@screen-share-459802.iam.gserviceaccount.com`
- 権限: Pub/Sub Publisher, Secret Accessor

## 依存サービス

| サービス | 用途 |
|---------|------|
| magi-ac | Alpaca価格取得API |
| Pub/Sub | price-updates発行 |

## コスト
- min-instances=0: 月額~$2
- 60秒ポーリング: API呼び出しコスト最小
