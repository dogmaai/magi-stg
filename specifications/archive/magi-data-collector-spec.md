# MAGI Data Collector (magi-data-collector) 詳細仕様

## 概要
- **目的**: 市場データ・ニュース・SEC文書の収集
- **デプロイ**: Cloud Run
- **URL**: https://magi-data-collector-398890937507.asia-northeast1.run.app
- **ポート**: 8080
- **バージョン**: 1.1.0
- **更新日**: 2025-01-01

## 機能

### 1. Alpaca News収集
- Alpaca Markets APIからニュース取得
- Vertex AI Embedding（768次元）でベクトル化
- BigQueryに保存

### 2. Google News RSS収集
- 銘柄関連ニュースをRSSから取得
- 無料・レート制限なし
- 重複チェック機能付き

### 3. SEC EDGAR収集
- 10-K（年次報告書）
- 10-Q（四半期報告書）
- 8-K（臨時報告書）

## 対応銘柄（CIKマッピング済み）

| Symbol | CIK | 企業名 |
|--------|-----|--------|
| AAPL | 0000320193 | Apple |
| MSFT | 0000789019 | Microsoft |
| NVDA | 0001045810 | NVIDIA |
| GOOGL | 0001652044 | Alphabet |
| AMZN | 0001018724 | Amazon |
| TSLA | 0001318605 | Tesla |
| META | 0001326801 | Meta |

## APIエンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | /health | ヘルスチェック |
| GET | /collect/status | 全Collector状態 |
| POST | /collect/news | Alpaca News V2収集 |
| GET | /collect/news/status | Alpaca Newsステータス |
| POST | /collect/google-news | Google News RSS収集 |
| GET | /collect/google-news/status | Google Newsステータス |
| POST | /collect/sec-edgar | SEC EDGAR収集 |
| GET | /collect/sec-edgar/status | SEC EDGARステータス |

## リクエスト例

### Google News収集
```json
POST /collect/google-news
{
  "symbols": ["AAPL", "NVDA"]
}
```

### SEC EDGAR収集
```json
POST /collect/sec-edgar
{
  "symbols": ["AAPL"],
  "limit": 5
}
```

## Embedding設定

| 項目 | 値 |
|------|-----|
| モデル | Vertex AI text-embedding-005 |
| 次元数 | 768 |
| リージョン | us-central1 |

## BigQuery保存先

| テーブル | 内容 |
|---------|------|
| magi_ac.news_embeddings | ニュースベクトル |
| magi_ac.sec_filings | SEC文書 |

## Pub/Sub連携

| トピック | 用途 |
|---------|------|
| price-updates | 価格変動通知（発行） |

## 完成度: 100%
