# MAGI System - API リファレンス v4.0

---

## magi-sys エンドポイント（4つ）

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /health | ヘルスチェック |
| GET | /status | 5つのAPIキー確認 |
| POST | /api/consensus | 質問応答（5 AI合議） |
| POST | /api/grok/ping | Grok接続確認 |

### POST /api/consensus

**リクエスト:**
```json
{
  "prompt": "AIの未来について分析して",
  "meta": {"mode": "integration"}
}
```

**レスポンス:**
```json
{
  "final": "統合された最終回答",
  "balthasar": "創造的視点からの回答",
  "melchior": "論理的視点からの回答",
  "casper": "人間的視点からの回答",
  "mary": "統合的視点からの回答",
  "sophia": "実践的視点からの回答",
  "metrics": {
    "response_time_ms": 5234,
    "valid_responses": 5
  }
}
```

---

## magi-ac エンドポイント（9つ）

### 株価分析（6つ）

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /health | ヘルスチェック |
| POST | /api/analyze | テクニカル分析 |
| GET | /api/technical/:symbol | テクニカル分析(GET) |
| POST | /api/ai-consensus | 4AI合議投資判断 + BigQuery保存 |
| GET | /api/history/:symbol | 分析履歴取得 |
| GET | /api/history/detail/:id | AI判断詳細取得 |

### 文書解析（3つ）

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/document/extract-financials | 財務数値抽出 |
| POST | /api/document/sentiment | センチメント分析 |
| POST | /api/document/summarize | 文書要約 |

### POST /api/ai-consensus

**リクエスト:**
```json
{"symbol": "AAPL"}
```

**レスポンス:**
```json
{
  "symbol": "AAPL",
  "recommendation": "HOLD",
  "confidence": 0.74,
  "votes": {"BUY": 1, "HOLD": 3, "SELL": 0},
  "aiJudgments": [
    {"provider": "grok", "action": "BUY", "confidence": 0.75},
    {"provider": "gemini", "action": "HOLD", "confidence": 0.72},
    {"provider": "claude", "action": "HOLD", "confidence": 0.78},
    {"provider": "mistral", "action": "HOLD", "confidence": 0.71}
  ]
}
```

---

## magi-stg エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /health | ヘルスチェック |
| GET | /api/specs | 仕様書一覧取得 |
| GET | /api/specs/:name | 個別仕様書取得 |

---

## 認証

全APIでIdentity Token必須:
```bash
TOKEN=$(gcloud auth print-identity-token)
curl -H "Authorization: Bearer $TOKEN" <URL>
```
