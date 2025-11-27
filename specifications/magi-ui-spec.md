# MAGI UI (magi-ui) 詳細仕様

## 概要

- **目的**: 統合ユーザーインターフェース
- **デプロイ**: Cloud Run
- **URL**: https://magi-ui-398890937507.asia-northeast1.run.app
- **ポート**: 8080

## 機能

### 1. 質問応答 (5AI合議)
- magi-sys と連携
- 4つのAI（Grok, Gemini, Claude, GPT-4）が回答
- モード選択: Consensus / Integration / Synthesis

### 2. 株価分析 (4AI合議)
- magi-ac と連携
- 4つのAI（Grok, Gemini, Claude, Mistral）が分析
- BUY/HOLD/SELL の推奨と信頼度

### 3. 文書解析
- Cohere (ISABEL) による解析
- センチメント分析
- レポート要約

### 4. 設定
- API URL設定
- モード切替

## UI構成

### ハンバーガーメニュー
- 質問応答
- 株価分析
- 文書解析
- 設定

### デザイン
- ダークテーマ（フィンテック風）
- アクセントカラー: #00ffb2
- レスポンシブ対応

## 技術スタック

- React 18
- Express.js (プロキシサーバー)
- google-auth-library (Identity Token)

## サービス間認証

magi-ui から magi-sys, magi-ac へのアクセスは Identity Token を使用。
```javascript
const { GoogleAuth } = require('google-auth-library');
const auth = new GoogleAuth();
const client = await auth.getIdTokenClient(targetUrl);
const token = await client.idTokenProvider.fetchIdToken(targetUrl);
```
