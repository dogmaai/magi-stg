# MAGI System v4.0 システム全体概要

**更新日**: 2025-11-26
**ステータス**: 本番稼働中
**完成度**: 100%

## システム構成
```
┌─────────────────────────────────────────────────────────┐
│                    MAGI System v4.0                      │
│               Multi-AI Consensus Platform                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  magi-ui      magi-sys      magi-ac       magi-moni     │
│  (UI)        (質問応答)    (証券分析)    (監視)         │
│                                                          │
│                    magi-stg (仕様書管理)                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Cloud Run サービス一覧

| サービス | ポート | 機能 | AI数 |
|---------|-------|------|------|
| magi-ac | 8888 | 証券分析・投資判断 | 5 |
| magi-app | 8080 | 質問応答・合議 | 5 |
| magi-stg | 8080 | 仕様書管理 | 0 |
| magi-ui | 8080 | ユーザーインターフェース | 0 |
| magi-moni | 8080 | システム監視 | 0 |

## AI統合状況

### magi-app (質問応答) - 5AI
| ユニット | AI | 役割 |
|---------|-----|------|
| BALTHASAR-2 | Grok | 創造的分析 |
| MELCHIOR-1 | Gemini | 論理的分析 |
| CASPER-3 | Claude | 人間的分析 |
| MARY-4 | GPT-4 | 統合的分析(Judge) |
| SOPHIA-5 | Mistral | 実践的分析 |

### magi-ac (証券分析) - 5AI
| ユニット | AI | 役割 |
|---------|-----|------|
| Unit-B2 | Grok | 創造的トレンド分析 |
| Unit-M1 | Gemini | 論理的数値分析 |
| Unit-C3 | Claude | 人間的価値分析 |
| Unit-R4 | Mistral | 実践的リスク分析 |
| ISABEL | Cohere | 文書解析・情報抽出 |

## データ基盤

### BigQuery (magi_ac)
- analyses: 4AI合議結果
- ai_judgments: 個別AI判断
- document_analyses: Cohere解析結果

### Cloud Storage
- gs://magi-documents/: 文書テキスト保存

### Secret Manager
- XAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY
- MISTRAL_API_KEY, OPENAI_API_KEY, COHERE_API_KEY

## 認証方式

- **組織ポリシー**: allUsers禁止
- **アクセス方法**: Identity Token必須
- **取得**: `gcloud auth print-identity-token`

## コスト設定

| 設定 | 値 | 月額目安 |
|-----|-----|---------|
| min-instances | 0 | $5以下 |
| memory | 1Gi | - |
| region | asia-northeast1 | - |

## 関連ドキュメント

- magi-ac-spec.md: 証券分析詳細
- magi-sys-spec.md: 質問応答詳細
- magi-moni-spec.md: 監視詳細
- api-endpoints.json: API一覧
- ai-models-config.json: AIモデル設定
