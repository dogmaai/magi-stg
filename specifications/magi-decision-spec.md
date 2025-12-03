# MAGI Decision (magi-decision) 詳細仕様

## 概要
- **目的**: AI全会一致による自動売買判断
- **デプロイ**: Cloud Run
- **URL**: https://magi-decision-398890937507.asia-northeast1.run.app
- **ポート**: 8080
- **バージョン**: 5.0.0
- **作成日**: 2025-12-03

## 機能

### AI全会一致ルール
- 4AI (Grok, Gemini, Claude, Mistral) の投資判断を取得
- 全員がBUYまたはSELL + 信頼度70%以上で自動売買シグナル発行
- 意見が分かれた場合はスキップ

### 判断フロー
```
価格変動検知 (Pub/Sub price-updates)
    ↓
magi-ac /api/analyze 呼び出し
    ↓
4AI投資判断取得
    ↓
全会一致判定 (evaluateUnanimous)
    ↓ YES
Bracket価格計算 (+5%/-3%)
    ↓
Pub/Sub trade-signals 発行
```

## 設定 (CONFIG)

| パラメータ | 値 | 説明 |
|-----------|-----|------|
| UNANIMOUS_REQUIRED | true | 全会一致必須 |
| MIN_CONFIDENCE | 0.70 | 最小信頼度 |
| TAKE_PROFIT_PCT | 5 | 利確% |
| STOP_LOSS_PCT | 3 | 損切% |
| DEFAULT_QTY | 1 | デフォルト数量 |
| PRICE_CHANGE_THRESHOLD | 1.5 | 価格変動閾値% |

## APIエンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | /health | ヘルスチェック |
| GET | /config | 設定確認 |
| POST | /decide | 手動判断トリガー |
| POST | /pubsub/price-update | 価格更新受信 |

### POST /decide
```json
// リクエスト
{"symbol": "AAPL"}

// レスポンス（シグナル発行時）
{
  "decision": "signal_issued",
  "symbol": "AAPL",
  "action": "BUY",
  "signal": {
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
}

// レスポンス（スキップ時）
{
  "decision": "no_action",
  "reason": "Not unanimous: BUY:1 HOLD:3 SELL:0"
}
```

## Pub/Sub連携

### 受信: price-updates
```json
{
  "symbol": "AAPL",
  "price": 286.19,
  "change_pct": 2.5,
  "timestamp": "2025-12-03T05:00:00Z"
}
```

### 発行: trade-signals
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
  "reason": "4AI unanimous BUY",
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
| magi-ac | AI分析取得 |
| Pub/Sub | シグナル発行 |
