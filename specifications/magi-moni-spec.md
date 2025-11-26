# MAGI Monitoring (magi-moni) 詳細仕様

## 概要
- **目的**: システム監視・ヘルスチェック
- **デプロイ**: Cloud Run
- **URL**: https://magi-moni-398890937507.asia-northeast1.run.app
- **ポート**: 8080
- **更新日**: 2025-11-26

## 監視対象サービス

| サービス | URL | 機能 |
|---------|-----|------|
| magi-ac | https://magi-ac-398890937507.asia-northeast1.run.app | 証券分析(5AI) |
| magi-app | https://magi-app-398890937507.asia-northeast1.run.app | 質問応答(5AI) |
| magi-stg | https://magi-stg-398890937507.asia-northeast1.run.app | 仕様書管理 |
| magi-ui | https://magi-ui-398890937507.asia-northeast1.run.app | UI |
| magi-moni | https://magi-moni-398890937507.asia-northeast1.run.app | モニタリング |

## APIエンドポイント (5個)
```
GET /health                      ヘルスチェック
GET /api/services                全サービスステータス一括確認
GET /api/services/:name/health   単一サービスヘルスチェック
GET /api/logs                    ログ統計（Cloud Console URL）
GET /api/bigquery                BigQuery情報
GET /api/overview                システム概要
```

## レスポンス例

### /api/services
```json
{
  "timestamp": "2025-11-26T07:00:00Z",
  "services": [
    { "name": "magi-ac", "status": "UP", "health": {...} },
    { "name": "magi-app", "status": "UP", "health": {...} }
  ],
  "summary": { "total": 5, "up": 5, "down": 0 }
}
```

### /api/overview
```json
{
  "system": "MAGI System v4.0",
  "services": 5,
  "ai_providers": {
    "magi-app": ["Grok", "Gemini", "Claude", "GPT-4", "Mistral"],
    "magi-ac": ["Grok", "Gemini", "Claude", "Mistral", "Cohere"]
  }
}
```

## Cloud Console リンク

- **ログ**: https://console.cloud.google.com/logs/query?project=screen-share-459802
- **BigQuery**: https://console.cloud.google.com/bigquery?project=screen-share-459802
- **Cloud Run**: https://console.cloud.google.com/run?project=screen-share-459802
