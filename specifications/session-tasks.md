# MAGI System - セッション引継ぎタスク管理

最終更新: 2026-03-31
更新者: Claude (PM/Architect)

---

## 現在のシステム状態

- magi-stg /public/specs: 正常 (200 OK, count:13)
- 7 LLM Jobs: 稼働中
- ISABEL L1-L5: 実装済み
- Optuna: 週次実行中

---

## 完了済みタスク（最近）

- [x] magi-stg 500エラー修正 (2026-03-31) - bootstrap.js追加、package.json修正
- [x] embed gap解消 - sync_embeddings.mjs、867件中199件embed完了

---

## 進行中・残タスク

### 高優先度
- [ ] magi-stg deploy.yml の --allow-unauthenticated を --no-allow-unauthenticated に修正（APMへ依頼）
- [ ] sync_embeddings.mjs の Cloud Scheduler自動化（Method A、Cloud Run Job経由）

### 中優先度
- [ ] OpenClawでログインできないアプリの問題調査（詳細未確認）
- [ ] MooMoo Phase 2（取引実行）- 150trades + Optuna再最適化後に着手

### 低優先度
- [ ] Grafanaダッシュボード拡張（Symbol VIXヒートマップ、LLMコスト）
- [ ] TablePlus BigQuery接続

---

## 次回セッション確認事項

- 残タスクの優先順位をJunと確認
- Optuna再最適化のトリガー条件（150 WIN+LOSE）到達状況

---

## ルール

- セッション開始時: このファイルを読んで状況をシンクする
- セッション終了時: 完了タスクを[x]に、新規タスクを追記し、APMにpushさせる
