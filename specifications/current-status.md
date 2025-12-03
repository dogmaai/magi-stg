# MAGI System 現在のステータス

## バージョン: 5.0 (Phase 3完了)
## 更新日: 2025-12-03
## 完成度: 95%

## サービス一覧（10サービス）

| サービス | URL | バージョン | 機能 |
|---------|-----|-----------|------|
| magi-ui | https://magi-ui-398890937507.asia-northeast1.run.app | 1.0 | 統合UI |
| magi-app | https://magi-app-398890937507.asia-northeast1.run.app | 1.0 | 5AI質問応答 |
| magi-ac | https://magi-ac-398890937507.asia-northeast1.run.app | 5.0 | 4AI証券分析+Alpaca |
| magi-stg | https://magi-stg-398890937507.asia-northeast1.run.app | 5.0 | 仕様書管理 |
| magi-moni | https://magi-moni-398890937507.asia-northeast1.run.app | 1.0 | 監視 |
| magi-data-collector | https://magi-data-collector-398890937507.asia-northeast1.run.app | 1.0 | データ収集 |
| magi-decision | https://magi-decision-398890937507.asia-northeast1.run.app | 5.0 | AI全会一致判断 |
| magi-executor | https://magi-executor-398890937507.asia-northeast1.run.app | 5.1 | 自動売買+監視 |
| magi-websocket | https://magi-websocket-398890937507.asia-northeast1.run.app | 1.3 | 価格監視+TrailingStop |

## 主要機能

### 1. 5AI質問応答（magi-sys）
- Grok, Gemini, Claude, GPT-4, Mistral
- 3つのモード: Consensus, Integration, Synthesis

### 2. 4AI証券分析（magi-ac）
- 銘柄分析でBUY/HOLD/SELL推奨
- Yahoo Finance連携
- Alpaca Paper Trading API

### 3. 自動売買パイプライン
- 価格監視（60秒ポーリング）
- AI全会一致ルール（4AI同意+信頼度70%以上）
- Bracket注文（利確+5%, 損切-3%）
- BigQuery保存

### 4. Trailing Stop戦略
- 含み益+2%でトリガー
- 高値から-2%で自動売却

### 5. Trade Updates監視
- 注文ステータス追跡
- 約定/キャンセル検知
- BigQuery自動保存

## Pub/Sub構成

| トピック | サブスクリプション | Push先 |
|---------|------------------|--------|
| price-updates | price-updates-decision | magi-decision |
| trade-signals | trade-signals-executor | magi-executor |
| trade-results | trade-results-monitor | magi-moni |

## BigQueryテーブル

| データセット | テーブル | 用途 |
|-------------|---------|------|
| magi_analytics | trade_logs | 取引ログ |
| magi_analytics | analyses | AI分析結果 |
| magi_analytics | ai_judgments | 個別AI判断 |

## 残りタスク

- [ ] UI統合（magi-uiに全機能集約）
