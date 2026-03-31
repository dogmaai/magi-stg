# MAGI System - セッション引継ぎタスク管理

最終更新: 2026-03-31
更新者: Claude (PM/Architect)

---

## セッション開始プロトコル

Junが以下をセッション冒頭に実行してClaudeに貼り付ける：

    cat ~/magi-stg/specifications/session-tasks.md

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
- [x] session-tasks.md 作成・運用開始 (2026-03-31)

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

## ルール

- セッション開始時: Junが cat ~/magi-stg/specifications/session-tasks.md を実行して内容をClaudeに貼り付ける
- セッション終了時: Claudeが更新内容を出力 → APMがGitHub pushする
