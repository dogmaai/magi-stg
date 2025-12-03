# MAGI System 現状まとめ

更新日: 2025-12-03 15:20 JST
バージョン: v5.0

## サービス一覧（10サービス）

| サービス | URL | 状態 | 機能 |
|----------|-----|------|------|
| magi-ui | https://magi-ui-398890937507.asia-northeast1.run.app | ✅ | 統合UI |
| magi-sys | https://magi-app-398890937507.asia-northeast1.run.app | ✅ | 5AI質問応答 |
| magi-ac | https://magi-ac-398890937507.asia-northeast1.run.app | ✅ | 4AI証券分析 + Alpaca |
| magi-stg | https://magi-stg-398890937507.asia-northeast1.run.app | ✅ | 仕様書管理 |
| magi-moni | https://magi-moni-398890937507.asia-northeast1.run.app | ✅ | 監視 |
| magi-data-collector | https://magi-data-collector-398890937507.asia-northeast1.run.app | ✅ | データ収集 |
| magi-decision | https://magi-decision-398890937507.asia-northeast1.run.app | ✅ | AI全会一致判断 |
| magi-executor | https://magi-executor-398890937507.asia-northeast1.run.app | ✅ | 自動売買執行 |
| magi-websocket | https://magi-websocket-398890937507.asia-northeast1.run.app | ✅ | 価格監視 |

## v5.0 自動売買パイプライン
```
magi-websocket (60秒ポーリング)
    ↓ Pub/Sub (price-updates)
magi-decision (AI全会一致判断)
    ↓ Pub/Sub (trade-signals)
magi-executor (Bracket注文執行)
    ↓ Alpaca API + BigQuery
```

## 監視銘柄（デフォルト）
- AAPL, NVDA, MSFT, GOOGL, AMZN

## 取引ルール

| パラメータ | 値 |
|-----------|-----|
| 全会一致必須 | true |
| 最小信頼度 | 70% |
| 利確ライン | +5% |
| 損切りライン | -3% |
| 価格変動閾値 | 0.5% |

## 完成度: 85%

### 完了
- [x] Yahoo Finance v3対応
- [x] Pub/Sub自動売買パイプライン
- [x] Bracket注文API
- [x] AI全会一致ルール
- [x] 自動執行エンジン
- [x] BigQuery取引ログ
- [x] 価格監視（REST Polling）
- [x] Pub/Sub Push連携

### 未着手
- [ ] Trailing Stop戦略
- [ ] Trade Updates監視
- [ ] UI統合
