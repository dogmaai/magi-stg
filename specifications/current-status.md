# MAGI System 現在のステータス

## バージョン: 5.0 (Alpaca MCP統合完了)
## 更新日: 2025-12-04
## 完成度: 95%

## サービス一覧（10サービス）

| サービス | URL | バージョン | 機能 |
|---------|-----|-----------|------|
| magi-ui | https://magi-ui-398890937507.asia-northeast1.run.app | 1.1 | 統合UI + MCPプロキシ |
| magi-app | https://magi-app-398890937507.asia-northeast1.run.app | 1.0 | 5AI質問応答 |
| magi-ac | https://magi-ac-398890937507.asia-northeast1.run.app | 5.0 | 4AI証券分析+Alpaca |
| magi-mcp | https://magi-mcp-398890937507.asia-northeast1.run.app | 1.0 | Alpaca MCP (43ツール) ★NEW |
| magi-stg | https://magi-stg-398890937507.asia-northeast1.run.app | 5.0 | 仕様書管理 |
| magi-moni | https://magi-moni-398890937507.asia-northeast1.run.app | 1.0 | 監視 |
| magi-data-collector | https://magi-data-collector-398890937507.asia-northeast1.run.app | 1.0 | データ収集 |
| magi-decision | https://magi-decision-398890937507.asia-northeast1.run.app | 5.0 | AI全会一致判断 |
| magi-executor | https://magi-executor-398890937507.asia-northeast1.run.app | 5.1 | 自動売買+監視 |
| magi-websocket | https://magi-websocket-398890937507.asia-northeast1.run.app | 1.3 | 価格監視+TrailingStop |

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

## Pub/Sub構成

| トピック | サブスクリプション | Push先 |
|---------|------------------|--------|
| price-updates | price-updates-decision | magi-decision |
| trade-signals | trade-signals-executor | magi-executor |
| trade-results | trade-results-monitor | magi-moni |

## 残りタスク

- [ ] UIにトレーディング画面追加
- [ ] 実際の注文テスト
- [ ] ポートフォリオダッシュボード
