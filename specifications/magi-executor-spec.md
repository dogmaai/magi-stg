# MAGI Executor (magi-executor) 詳細仕様

## 概要
- 目的: 自動売買執行 + Trade Updates監視
- URL: https://magi-executor-398890937507.asia-northeast1.run.app
- バージョン: 5.1.0

## 機能

### 1. Bracket注文実行
- BUYシグナル → Bracket注文（Entry + TP + SL）
- SELLシグナル → 成行売却

### 2. BigQuery保存
- 全取引をtrade_logsテーブルに記録
- タイムスタンプ、銘柄、価格、信頼度など

### 3. Trade Updates監視
- 注文ステータスを定期チェック
- filled/canceled/expired検知
- 状態変化をBigQuery保存

## エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /health | ヘルスチェック |
| POST | /execute | 手動注文実行 |
| POST | /pubsub/trade-signal | Pub/Subシグナル受信 |
| POST | /monitor/start | 監視開始 |
| POST | /monitor/stop | 監視停止 |
| POST | /monitor/check | 手動チェック |
| GET | /history | 取引履歴 |
| GET | /orders/tracked | 追跡中の注文 |

## Pub/Sub

- 受信: trade-signals トピック
- 発行: trade-results トピック
