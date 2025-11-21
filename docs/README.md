# MAGI System ドキュメント

**バージョン:** 4.0  
**最終更新:** 2025-11-21  
**ステータス:** Production Ready

## 📚 ドキュメント一覧

### 実装ガイド
- `01_LLM_SPECIFICATIONS.md` - 5つのAI役割説明
- `02_ARCHITECTURE.md` - システムアーキテクチャ
- `03_API_REFERENCE.md` - API エンドポイント
- `04_BIGQUERY_INTEGRATION.md` - BigQuery 統合
- `05_CLOUD_STORAGE_INTEGRATION.md` - Cloud Storage 統合

## 🚀 本番環境 URL

**MAGI System:** https://magi-app-398890937507.run.app
**MAGI Analytics:** https://magi-ac-398890937507.asia-northeast1.run.app

## 📊 実装完成度
```
MAGI System:        100% ✓
MAGI Analytics:     100% ✓
Cohere 統合:        100% ✓
ドキュメント:       85%
BigQuery 統合:      0% (計画中)
Cloud Storage:      0% (計画中)

総合: 88%
```


---

## 06. Cloud Storage 統合実装完了

**ステータス:** ✅ 実装完了・テスト済み

### 実装内容
- Cloud Storage バケット設定
- cloud-storage.js モジュール
- ローカル環境テスト成功
- Cloud Run デプロイ準備完了

### ファイル保存例
```
uploads/2025-11-21/AAPL_test_1763692847618.txt
analysis-results/2025-11-21/AAPL_earnings_1763692848155.json
```

### 次: Cloud Run デプロイ


---

## 📊 BigQuery 統合実装完了

**ステータス:** ✅ 実装完了・テスト済み

### 実装内容
- BigQuery データセット作成
- 3つのテーブル設計
  - magi_investment_analysis（投資判断）
  - magi_financial_data（財務データ）
  - magi_sentiment_analysis（センチメント分析）
- ユーティリティモジュール実装
- ローカル環境テスト成功

### テスト結果
```
✅ 投資判断データ保存
✅ 財務データ保存
✅ センチメント分析保存
✅ 過去30日のデータ取得成功
```

### 次: Cloud Run デプロイ


---

## 📋 LLM 役割管理

### ファイル一覧

**data/ フォルダ:**
- `llm-roles.json` - 各 LLM の役割定義（JSON）
- `system-prompts.json` - システムプロンプト集

**ドキュメント:**
- `LLM_ROLE_CLARIFICATION.md` - 役割混乱防止ガイド

### 使用方法
```javascript
// llm-roles.json を読み込む
import llmRoles from './docs/data/llm-roles.json';

// BALTHASAR-2 の役割を確認
console.log(llmRoles.llms.grok.specialty);
// → ["トレンド予測", "イノベーション分析", ...]

// システムプロンプトを取得
import systemPrompts from './docs/data/system-prompts.json';
const grokPrompt = systemPrompts.system_prompts.grok.prompt;
```

### 重要

各 LLM の役割は **絶対に変更しないでください**。
役割の明確さが MAGI System の強みです！

