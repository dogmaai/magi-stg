# MAGI System v5.0 全体概要

## システム構成
```
┌─────────────────────────────────────────────────────────────────┐
│                      MAGI System v5.0                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │   magi-ui    │ ← 統合UI（ハンバーガーメニュー）              │
│  │   :8080      │                                               │
│  └──────┬───────┘                                               │
│         │ Identity Token認証                                    │
│    ┌────┴────┐                                                  │
│    ▼         ▼                                                  │
│  ┌──────┐  ┌──────┐  ┌────────────┐  ┌────────────┐           │
│  │magi- │  │magi- │  │magi-       │  │magi-       │           │
│  │sys   │  │ac    │  │decision    │  │executor    │           │
│  │:8080 │  │:8888 │  │:8080       │  │:8080       │           │
│  └──────┘  └──────┘  └────────────┘  └────────────┘           │
│  5AI合議   4AI分析    AI全会一致判断   自動売買執行             │
│            +Alpaca                                              │
│                                                                  │
│  ┌─────────────────────────────────────────────┐               │
│  │              Pub/Sub パイプライン            │               │
│  │  price-updates → trade-signals → trade-results │             │
│  └─────────────────────────────────────────────┘               │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   magi-stg   │  │   magi-moni  │                            │
│  │  仕様書管理   │  │   監視       │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## サービス一覧

| サービス | 目的 | URL |
|----------|------|-----|
| magi-ui | 統合UI | https://magi-ui-398890937507.asia-northeast1.run.app |
| magi-sys | 質問応答(5AI) | https://magi-app-398890937507.asia-northeast1.run.app |
| magi-ac | 株価分析(4AI)+Alpaca | https://magi-ac-398890937507.asia-northeast1.run.app |
| magi-decision | AI全会一致判断 | https://magi-decision-398890937507.asia-northeast1.run.app |
| magi-executor | 自動売買執行 | https://magi-executor-398890937507.asia-northeast1.run.app |
| magi-stg | 仕様書管理 | https://magi-stg-398890937507.asia-northeast1.run.app |
| magi-moni | 監視 | https://magi-moni-398890937507.asia-northeast1.run.app |

## 自動売買フロー
```
1. 価格変動検知
   └─→ Pub/Sub (price-updates)
       └─→ magi-decision

2. AI全会一致判断
   └─→ magi-ac /api/analyze 呼び出し
   └─→ 4AI全員BUY + 信頼度70%以上？
       └─→ YES: Pub/Sub (trade-signals) 発行
       └─→ NO: スキップ

3. 自動執行
   └─→ magi-executor
   └─→ Bracket注文（Entry + TP + SL）
   └─→ Alpaca API
   └─→ BigQuery ログ保存
   └─→ Pub/Sub (trade-results)
```

## 認証方式

- Cloud Run サービス間: Identity Token
- Alpaca API: API Key + Secret (Secret Manager)
- IAM: serviceAccount に roles/run.invoker 付与

## 技術スタック

- **バックエンド**: Node.js, Express
- **フロントエンド**: React 18
- **インフラ**: Google Cloud Run
- **メッセージング**: Pub/Sub
- **認証**: google-auth-library
- **データ**: BigQuery, Cloud Storage
- **取引**: Alpaca API (Paper Trading)
