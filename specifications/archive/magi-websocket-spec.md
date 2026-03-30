# MAGI WebSocket (magi-websocket) 詳細仕様

## 概要
- 目的: 価格監視 + Trailing Stop戦略
- URL: https://magi-websocket-398890937507.asia-northeast1.run.app
- バージョン: 1.3.0
- 方式: REST APIポーリング（60秒間隔）

## 機能

### 1. 価格監視
- magi-acの /alpaca/quote/:symbol をポーリング
- 監視銘柄: AAPL, NVDA, MSFT, GOOGL, AMZN
- 価格変動0.5%以上でPub/Sub発行

### 2. Trailing Stop戦略
- トリガー: 含み益+2%以上
- Trail: 高値から-2%で売却
- 自動でAlpaca Trailing Stop注文発行

## 設定

| パラメータ | 値 |
|-----------|-----|
| POLLING_INTERVAL | 60000ms |
| PRICE_CHANGE_THRESHOLD | 0.5% |
| TRAILING_STOP_TRIGGER | 2.0% |
| TRAILING_STOP_PERCENT | 2.0% |

## エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /health | ヘルスチェック |
| GET | /config | 設定確認 |
| POST | /start | ポーリング開始 |
| POST | /stop | ポーリング停止 |
| POST | /poll | 手動ポーリング |
| POST | /trailing-stop/check | Trailing Stop戦略実行 |
| POST | /trailing-stop/clear | 状態クリア |
