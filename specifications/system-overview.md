# MAGI System v4.0 全体概要

## システム構成
```
┌─────────────────────────────────────────────────────────┐
│                    MAGI System v4.0                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐                                       │
│  │   magi-ui    │ ← 統合UI（ハンバーガーメニュー）      │
│  │   :8080      │                                       │
│  └──────┬───────┘                                       │
│         │ Identity Token認証                            │
│    ┌────┴────┐                                          │
│    ▼         ▼                                          │
│  ┌──────┐  ┌──────┐                                    │
│  │magi- │  │magi- │                                    │
│  │sys   │  │ac    │                                    │
│  │:8080 │  │:8888 │                                    │
│  └──────┘  └──────┘                                    │
│  4AI合議   4AI分析                                      │
│                                                          │
│  ┌──────────────┐                                       │
│  │   magi-stg   │ ← 仕様書管理                         │
│  └──────────────┘                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## サービス一覧

| サービス | 目的 | URL |
|----------|------|-----|
| magi-ui | 統合UI | https://magi-ui-398890937507.asia-northeast1.run.app |
| magi-sys | 質問応答 | https://magi-app-398890937507.asia-northeast1.run.app |
| magi-ac | 株価分析 | https://magi-ac-398890937507.asia-northeast1.run.app |
| magi-stg | 仕様書管理 | https://magi-stg-dtrah63zyq-an.a.run.app |

## 機能概要

### 質問応答 (magi-sys)
- 4つのAI（Grok, Gemini, Claude, GPT-4）が並列回答
- 合議による最終回答生成

### 株価分析 (magi-ac)
- Yahoo Finance からリアルタイムデータ取得
- 4つのAI（Grok, Gemini, Claude, Mistral）が分析
- BUY/HOLD/SELL の投資推奨

### 文書解析 (Cohere ISABEL)
- センチメント分析
- レポート要約
- 財務データ抽出

## 認証方式

- Cloud Run サービス間: Identity Token
- IAM: serviceAccount に roles/run.invoker 付与

## 技術スタック

- **バックエンド**: Node.js, Express
- **フロントエンド**: React 18
- **インフラ**: Google Cloud Run
- **認証**: google-auth-library
- **データ**: BigQuery, Cloud Storage

