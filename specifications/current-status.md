# MAGI System 現在のステータス

## バージョン: 7.0 (Algo Prediction System)
## 更新日: 2026-01-03
## 完成度: 98%

## サービス一覧（10サービス）

| サービス | URL | バージョン | 機能 |
|---------|-----|-----------|------|
| magi-ui | https://magi-ui-398890937507.asia-northeast1.run.app | 1.1 | 統合UI + MCPプロキシ |
| magi-app | https://magi-app-398890937507.asia-northeast1.run.app | 1.0 | 5AI質問応答 |
| magi-ac | https://magi-ac-398890937507.asia-northeast1.run.app | 7.0 | 4AI証券分析+Alpaca SDK+Algo Prediction |
| magi-mcp | https://magi-mcp-398890937507.asia-northeast1.run.app | 1.0 | Alpaca MCP (43ツール) ★NEW |
| magi-stg | https://magi-stg-398890937507.asia-northeast1.run.app | 5.0 | 仕様書管理 |
| magi-moni | https://magi-moni-398890937507.asia-northeast1.run.app | 1.0 | 監視 |
| magi-data-collector | https://magi-data-collector-398890937507.asia-northeast1.run.app | 1.0 | データ収集 |
| magi-decision | https://magi-decision-398890937507.asia-northeast1.run.app | 5.0 | AI全会一致判断 |
| magi-executor | https://magi-executor-398890937507.asia-northeast1.run.app | 5.1 | 自動売買+監視 |
| magi-websocket | https://magi-websocket-398890937507.asia-northeast1.run.app | 1.3 | 価格監視+TrailingStop |

## v7.0 新機能（2026-01-03）

### magi-ac v7.0 (Algo Prediction System)
- アルゴリズム行動予測システム実装
- 他のAI/アルゴリズムの行動を予測し先回り
- BigQueryテーブル prediction_tracking_v2 作成
- アルゴ検出モジュール (lib/algo-detector.js)
  - 出来高異常検出（標準偏差ベース、2σ閾値）
  - パターン分類（MOMENTUM/MEAN_REVERT/BREAKOUT）
  - 他AI行動予測（ACCUMULATE/DISTRIBUTE/HOLD）
- 新規エンドポイント
  - GET /api/algo-pattern/:symbol - アルゴパターン分析
  - POST /api/ai-consensus - MAGI AI合議（アルゴ検知統合）
  - GET /api/algo-prediction/history/:symbol - 予測履歴
  - GET /api/algo-prediction/stats - 予測統計
- 評価ジョブ magi-evaluator (Cloud Function)
  - 毎日09:00 JSTに自動実行
  - 予測精度を自動評価（1日後・1週間後）
- Phase 1（1月）完了：基盤構築
- Phase 2（2月）予定：データ蓄積・プロンプト改修
- Phase 3（3月）予定：精度検証・本番移行判断

### v7.0 システムアーキテクチャ
```
市場データ → アルゴパターン検出 → 他AI行動予測 → MAGI合議 → 投資判断
```

### v7.0 AI役割変更
| AI Unit | 従来の役割 | v7.0の役割 |
|---------|------------|------------|
| BALTHASAR-2 (Grok) | トレンド分析 | アルゴの群集行動予測 |
| MELCHIOR-1 (Gemini) | 財務分析 | 出来高・約定パターン分析 |
| CASPER-3 (Claude) | ESG・倫理分析 | 市場操作リスク検知 |
| SOPHIA-5 (Mistral) | リスク分析 | アルゴ同士の競合分析 |

### v7.0 成功基準（本番移行判断: 3月）
| 指標 | 最低基準 | 目標値 |
|------|----------|--------|
| アルゴ行動予測精度 | 55%以上 | 65%以上 |
| 価格予測精度（1日） | 50%以上 | 60%以上 |
| データ件数 | 100件以上 | 300件以上 |
| BUY的中時平均リターン | +3%以上 | +5%以上 |

---

## v6.0 新機能（2025-12-12）

### magi-ac v6.0 (Alpaca SDK移行完了)
- Alpaca SDK完全移行
- 5AI全て正常動作確認済み
  - Unit-B2 (Grok): 創造的トレンド分析
  - Unit-M1 (Gemini): 論理的数値分析
  - Unit-C3 (Claude): 人間的価値分析
  - Unit-R4 (Mistral): 実践的リスク分析
  - ISABEL (Cohere): 文書解析・情報抽出
- Pub/Subパイプライン完全動作確認済み

### テスト結果
- AAPL Bracket注文: 成功

---

## v5.0 新機能（2025-12-04）

### magi-mcp (Alpaca MCP Server)
- 43個のトレーディングツール
- 株式・暗号通貨・オプション対応
- Paper Trading口座接続済み（$100k）
- MCP Protocol 2024-11-05

### magi-ui MCPプロキシ
- GET /proxy/mcp/tools - ツール一覧
- POST /proxy/mcp/call - ツール呼び出し
- セッション自動管理（4分キャッシュ）

## Paper Trading口座

| 項目 | 値 |
|------|-----|
| Account ID | 45f3802a-3c9a-4c30-b2b6-b0abc975f5f1 |
| Portfolio Value | $100,003 |
| Cash | $98,594 |
| Buying Power | $198,598 |

### 現在のポジション
| 銘柄 | 数量 | 損益 |
|------|------|------|
| AAPL | 2株 | +$3.71 |
| MSFT | 1株 | +$1.48 |
| NVDA | 2株 | -$1.70 |

## 主要機能

### 1. 5AI質問応答（magi-app）
- Grok, Gemini, Claude, GPT-4, Mistral
- 3つのモード: Consensus, Integration, Synthesis

### 2. 4AI証券分析（magi-ac）
- 銘柄分析でBUY/HOLD/SELL推奨
- Yahoo Finance連携
- Alpaca直接API

### 3. MCP取引（magi-mcp）★NEW
- 43個のAlpacaツール
- 株式・暗号通貨・オプション
- magi-ui経由でアクセス

### 4. 自動売買パイプライン
- 価格監視（60秒ポーリング）
- AI全会一致ルール（4AI同意+信頼度70%以上）
- Bracket注文（利確+5%, 損切-3%）

## Pub/Sub構成 (完全動作確認済み)

| トピック | サブスクリプション | Push先 | ステータス |
|---------|------------------|--------|----------|
| price-updates | price-updates-decision | magi-decision | 動作確認済み |
| trade-signals | trade-signals-executor | magi-executor | 動作確認済み |
| trade-results | trade-results-monitor | magi-moni | 動作確認済み |

## 残りタスク

- [ ] UIにトレーディング画面追加
- [ ] 実際の注文テスト
- [ ] ポートフォリオダッシュボード
