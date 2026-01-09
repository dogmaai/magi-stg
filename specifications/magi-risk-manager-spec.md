# MAGI Risk Manager 仕様書 v1.0

## 概要

**magi-risk-manager** は、MAGI Systemのリスク管理サービスです。すべての取引注文を実行前に検証し、ポートフォリオを保護するための6つのリスクルールを適用します。

## サービス情報

| 項目 | 値 |
|------|-----|
| サービス名 | magi-risk-manager |
| バージョン | 1.0.0 |
| URL | https://magi-risk-manager-398890937507.asia-northeast1.run.app |
| リージョン | asia-northeast1 |
| メモリ | 512Mi |

## リスクルール

| # | ルール | 閾値 | 重要度 |
|---|--------|------|--------|
| 1 | 単一取引リスク | ポートフォリオの0.5% | ERROR |
| 2 | 単一銘柄ポジション上限 | 25% | ERROR |
| 3 | セクター集中度 | 15% | WARNING |
| 4 | 日次取引回数 | 20回/日 | ERROR |
| 5 | 日次損失上限 | 2% | CRITICAL |
| 6 | 週次損失上限 | 5% | CRITICAL |

## キルスイッチ

| レベル | 動作 |
|--------|------|
| Level 0 | 通常運転 |
| Level 1 | 全取引停止（BUY/SELL両方ブロック） |
| Level 2 | 新規BUYのみブロック（SELL許可） |

## APIエンドポイント

### GET /health
ヘルスチェック

**レスポンス:**
```json
{
  "status": "healthy",
  "service": "magi-risk-manager",
  "version": "1.0.0",
  "killswitch": "inactive"
}
```

### GET /api/config
リスク設定取得

### GET /api/portfolio
現在のポートフォリオ情報

### GET /api/dashboard
ダッシュボード（口座・ポジション・損益・キルスイッチ状態）

### POST /api/validate
取引リスク検証（メイン機能）

**リクエスト:**
```json
{
  "symbol": "AAPL",
  "qty": 1,
  "price": 259.73,
  "side": "buy"
}
```

**レスポンス:**
```json
{
  "approved": true,
  "status": "APPROVED",
  "originalQty": 1,
  "adjustedQty": 1,
  "checks": [...],
  "brackets": {
    "entryPrice": 259.73,
    "stopLossPrice": 251.94,
    "takeProfitPrice": 275.31
  }
}
```

### POST /api/killswitch/activate
キルスイッチ発動

**リクエスト:**
```json
{
  "level": 1,
  "reason": "Manual emergency stop"
}
```

### POST /api/killswitch/deactivate
キルスイッチ解除（確認コード必須）

**リクエスト:**
```json
{
  "confirmCode": "MAGI_RESTART_CONFIRMED"
}
```

### GET /api/killswitch/status
キルスイッチ状態確認

## ブラケット価格計算

| 項目 | BUY時 | SELL時 |
|------|-------|--------|
| ストップロス | -3% | +3% |
| テイクプロフィット | +6% | -6% |

## 連携サービス

- **magi-executor**: 注文実行前にvalidateを呼び出し
- **Alpaca API**: ポートフォリオ・注文履歴取得

## ファイル構成
```
magi-risk-manager/
├── bootstrap.js
├── package.json
└── src/
    ├── index.js           # Expressサーバー
    ├── portfolio-service.js # Alpaca連携
    ├── risk-checker.js    # リスクルール検証
    └── risk-config.js     # 設定値
```

## 更新履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2026-01-09 | 1.0.0 | 初版リリース |