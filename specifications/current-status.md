# MAGI System 現状まとめ

更新日: 2025-11-28

## サービス一覧

| サービス | URL | 状態 |
|----------|-----|------|
| magi-ui | https://magi-ui-398890937507.asia-northeast1.run.app | 稼働中 |
| magi-sys | https://magi-app-398890937507.asia-northeast1.run.app | 稼働中 |
| magi-ac | https://magi-ac-398890937507.asia-northeast1.run.app | 稼働中 |
| magi-stg | https://magi-stg-398890937507.asia-northeast1.run.app | 稼働中 |

## magi-ac 機能一覧

| 機能 | エンドポイント | 状態 |
|------|---------------|------|
| 4AI合議投資判断 | POST /api/ai-consensus | OK |
| テクニカル分析 | POST /api/analyze | OK |
| 文書解析 | POST /api/document/* | OK |
| 機関投資家分析 | POST /api/institutional/analyze | OK |
| AI株価予測 | POST /api/predict | OK (3AI) |

## AI 稼働状況

| AI | magi-sys | magi-ac判断 | magi-ac予測 |
|----|----------|------------|------------|
| Grok | OK | OK | OK |
| Gemini | OK | OK | OK |
| Claude | OK | OK | OK |
| GPT-4 | OK | - | - |
| Mistral | OK | OK | Reserve |
| Cohere | - | OK | - |

## 残タスク

| 項目 | 優先度 |
|------|--------|
| Mistral予測修正 | 低 |
| Yahoo Finance修正 | 中 |
| BigQuery保存確認 | 中 |
