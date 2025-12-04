# MAGI MCP (magi-mcp) 詳細仕様

## 概要
- **目的**: Alpaca Trading API統合（MCP Server）
- **デプロイ**: Cloud Run
- **URL**: https://magi-mcp-398890937507.asia-northeast1.run.app
- **ポート**: 8080
- **バージョン**: 1.0.0
- **作成日**: 2025-12-04

## プロトコル

- **MCP Version**: 2024-11-05
- **Transport**: streamable-http
- **Endpoint**: POST /mcp
- **Session**: mcp-session-id ヘッダーで管理
- **セッション有効期限**: 5分

## 43 Trading Tools

### 口座管理 (3ツール)
| ツール | 説明 |
|--------|------|
| get_account_info | 口座情報取得（残高、購買力、ポートフォリオ価値） |
| get_portfolio_history | ポートフォリオ履歴（PnL推移） |
| get_clock | マーケット時計（取引時間確認） |

### ポジション管理 (4ツール)
| ツール | 説明 |
|--------|------|
| get_all_positions | 全ポジション取得 |
| get_open_position | 特定銘柄のポジション取得 |
| close_position | 特定ポジション決済 |
| close_all_positions | 全ポジション一括決済 |

### 株式注文 (4ツール)
| ツール | 説明 |
|--------|------|
| place_stock_order | 株式注文（MARKET/LIMIT/STOP/STOP_LIMIT/TRAILING_STOP） |
| get_orders | 注文一覧取得 |
| cancel_order_by_id | 特定注文キャンセル |
| cancel_all_orders | 全注文一括キャンセル |

### 株式データ (7ツール)
| ツール | 説明 |
|--------|------|
| get_stock_latest_quote | 最新気配値（bid/ask） |
| get_stock_latest_trade | 最新約定価格 |
| get_stock_latest_bar | 最新OHLCV |
| get_stock_bars | 履歴バーデータ |
| get_stock_quotes | 履歴気配データ |
| get_stock_trades | 履歴約定データ |
| get_stock_snapshot | 銘柄スナップショット |

### 暗号通貨 (4ツール)
| ツール | 説明 |
|--------|------|
| place_crypto_order | 暗号通貨注文 |
| get_crypto_latest_quote | 最新価格（BTC/ETH等） |
| get_crypto_bars | 履歴データ |
| get_crypto_snapshot | スナップショット |

### オプション (5ツール)
| ツール | 説明 |
|--------|------|
| get_option_contracts | オプション契約検索 |
| get_option_latest_quote | オプション気配値 |
| get_option_snapshot | Greeks含むスナップショット |
| place_option_market_order | オプション成行注文 |
| exercise_options_position | 権利行使 |

### ウォッチリスト (3ツール)
| ツール | 説明 |
|--------|------|
| create_watchlist | ウォッチリスト作成 |
| get_watchlists | ウォッチリスト一覧 |
| update_watchlist_by_id | ウォッチリスト更新 |

### その他 (4ツール)
| ツール | 説明 |
|--------|------|
| get_asset | 特定資産情報 |
| get_all_assets | 全資産一覧 |
| get_corporate_actions | コーポレートアクション |
| get_calendar | マーケットカレンダー |

## 使用例

### MCP初期化
```bash
TOKEN=$(gcloud auth print-identity-token)
URL="https://magi-mcp-398890937507.asia-northeast1.run.app"

curl -X POST "$URL/mcp" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0"}
    }
  }'
# レスポンスヘッダーのmcp-session-idを保存
```

### ツール呼び出し
```bash
curl -X POST "$URL/mcp" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_account_info",
      "arguments": {}
    }
  }'
```

## magi-ui経由のアクセス

magi-uiがプロキシとして機能：
```bash
# ツール一覧
curl "$MAGI_UI_URL/proxy/mcp/tools" \
  -H "Authorization: Bearer $TOKEN"

# ツール呼び出し
curl -X POST "$MAGI_UI_URL/proxy/mcp/call" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_account_info", "arguments": {}}'
```

## Paper Trading口座

| 項目 | 値 |
|------|-----|
| Account ID | 45f3802a-3c9a-4c30-b2b6-b0abc975f5f1 |
| Status | ACTIVE |
| Currency | USD |
| Portfolio Value | ~$100,003 |
| Cash | ~$98,594 |
| Buying Power | ~$198,598 |
| Pattern Day Trader | No |

## Secret Manager

| キー | 用途 |
|-----|------|
| ALPACA_API_KEY | Alpaca APIキー |
| ALPACA_SECRET_KEY | Alpaca シークレット |

## 環境変数
```
PORT=8080
ALPACA_PAPER_TRADE=True
```

## サービス間認証

magi-uiからのアクセスにはIAM設定が必要：
```bash
gcloud run services add-iam-policy-binding magi-mcp \
  --region=asia-northeast1 \
  --member="serviceAccount:398890937507-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"
```

## 技術スタック

- **言語**: Python 3.12
- **フレームワーク**: FastMCP
- **ライブラリ**: 
  - mcp==1.23.1
  - alpaca-py
  - uvicorn

## 完成度: 100%
