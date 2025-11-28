# MAGI System 現状まとめ

更新日: 2025-11-28 19:55 JST

## サービス一覧

| サービス | URL | 状態 | Revision |
|----------|-----|------|----------|
| magi-ui | https://magi-ui-398890937507.asia-northeast1.run.app | ✅ 稼働中 | - |
| magi-sys | https://magi-app-398890937507.asia-northeast1.run.app | ✅ 稼働中 | - |
| magi-ac | https://magi-ac-398890937507.asia-northeast1.run.app | ✅ 稼働中 | 00039-8rf |
| magi-stg | https://magi-stg-398890937507.asia-northeast1.run.app | ✅ 稼働中 | - |

## magi-ac 機能一覧

| 機能 | エンドポイント | 状態 |
|------|---------------|------|
| 4AI合議投資判断 | POST /api/analyze | ✅ consensus動作 |
| テクニカル分析 | POST /api/analyze | ✅ |
| 文書解析（Cohere） | POST /api/document/* | ✅ |
| 機関投資家分析（IAA） | POST /api/institutional/analyze | ✅ |
| AI株価予測（4AI） | POST /api/predict | ✅ 4AI全稼働 |

## AI 稼働状況

| AI | magi-sys | magi-ac判断 | magi-ac予測 |
|----|----------|------------|------------|
| Grok | ✅ | ✅ | ✅ |
| Gemini | ✅ | ✅ | ✅ |
| Claude | ✅ | ✅ | ✅ |
| GPT-4 | ✅ | - | - |
| Mistral | ✅ | ✅ | ✅ |
| Cohere | - | ✅ (文書解析) | - |

## 2025-11-28 完了タスク

- [x] AI株価予測システム実装（4AI統合）
- [x] テクニカル指標追加（RSI, MACD, BB）
- [x] Mistral JSONパースエラー修正
- [x] Yahoo Finance API修正（yahoo-finance2移行）
- [x] Claude モデル名更新（claude-sonnet-4-20250514）
- [x] consensus null問題修正（calculateConsensus関数追加）
- [x] GitHubプッシュ完了（6コミット）
- [x] Cloud Runデプロイ完了

## 残タスク（優先度低）

| 項目 | 優先度 | 備考 |
|------|--------|------|
| BigQuery保存確認 | 低 | 動作確認のみ |
| MooMoo API統合 | 低 | Mac設定待ち |
| OAuth認可フロー | 中 | 次回検討 |

## 会話継続の仕組み
```
magi-stg 公開エンドポイント（認証不要）
├── /public/specs → 全仕様書
├── /public/overview → システム概要
└── /health → ヘルスチェック

セッション開始時:
→ https://magi-stg-398890937507.asia-northeast1.run.app/public/specs をフェッチ
```

## APIテスト例
```bash
# 株価分析（consensus付き）
curl -X POST https://magi-ac-398890937507.asia-northeast1.run.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL"}'

# AI株価予測
curl -X POST https://magi-ac-398890937507.asia-northeast1.run.app/api/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","horizon":"1year","enableAI":true}'
```
