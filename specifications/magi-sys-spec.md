# MAGI System (magi-sys) 詳細仕様

## 概要

- **目的**: 質問応答・合議システム
- **AI数**: 4つ（実稼働）
- **デプロイ**: Cloud Run
- **URL**: https://magi-app-398890937507.asia-northeast1.run.app
- **ポート**: 8080

## AI構成

### BALTHASAR-2 (Grok / xAI)
- **役割**: 創造的・革新的分析
- **Model**: grok-2-latest
- **Temperature**: 0.5
- **得意**: トレンド予測、イノベーション分析

### MELCHIOR-1 (Gemini / Google)
- **役割**: 論理的・科学的分析
- **Model**: gemini-2.0-flash-exp
- **Temperature**: 0.2
- **得意**: データ分析、科学的検証

### CASPER-3 (Claude / Anthropic)
- **役割**: 人間的・感情的分析
- **Model**: claude-sonnet-4-20250514
- **Temperature**: 0.4
- **得意**: 倫理判断、長期的影響分析

### MARY-4 (GPT-4 / OpenAI)
- **役割**: 統合的・バランス分析
- **Model**: gpt-4o-mini
- **Temperature**: 0.3
- **得意**: 意見統合、コンセンサス形成

## APIエンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /health | ヘルスチェック |
| GET | /status | AI設定状態確認 |
| POST | /api/consensus | 質問応答（4AI合議） |

## レスポンス形式
```json
{
  "final": "最終回答",
  "balthasar": "Grokの回答",
  "melchior": "Geminiの回答",
  "casper": "Claudeの回答",
  "mary": "GPT-4の回答",
  "metrics": {
    "ms": 2500,
    "valid": 4
  }
}
```

## 認証

- Cloud Run: Identity Token 必須
- IAM: roles/run.invoker
