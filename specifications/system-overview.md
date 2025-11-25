# MAGI System Overview v4.0

## システム全体構成
```
MAGI Ecosystem
├─ magi-sys: 質問応答システム (5 AI合議)
├─ magi-ac: 証券分析システム (4 AI判断 + 1 AI文書解析)
└─ magi-stg: 仕様書管理システム
```

## デプロイ情報

- **Region**: asia-northeast1
- **Project**: screen-share-459802
- **Platform**: Google Cloud Run (serverless)

## システムURL

- magi-sys: https://magi-app-398890937507.run.app
- magi-ac: https://magi-ac-398890937507.run.app
- magi-stg: https://magi-stg-398890937507.run.app

## 認証方式

- Cloud Run: Identity Token (gcloud auth print-identity-token)
- Org Policy: allUsers 禁止 (--no-allow-unauthenticated)
- Local: Cloud Shell Web Preview (localhost:8080/8888/8090)

## 重要な運用ルール

1. package.json の "start" は必ず "node server.js" (bootstrap.jsではない)
2. デプロイ前に既存プロセスを終了 (pkill -f "npm start")
3. ポート使用: magi-sys=8080, magi-ac=8888, magi-stg=8090
4. Secret Manager経由でAPIキー管理
