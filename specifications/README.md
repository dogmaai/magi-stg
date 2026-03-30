# MAGI System 仕様書索引

最終更新: 2026-03-30
バージョン: 4.2

## エントリーポイント

このディレクトリがMAGIシステムの仕様書の唯一の正となる場所です。
AIエージェント・開発者はここから読み始めてください。

## 仕様書一覧

### system/ - システム仕様
- [overview.md](system/overview.md) - システム全体概要・アーキテクチャ
- [guard-system.md](system/guard-system.md) - 7層ガードシステム詳細
- [data-schema.md](system/data-schema.md) - BigQueryテーブル定義

### agents/ - AI開発者向け
- [AGENTS.md](agents/AGENTS.md) - AI開発エージェント向けガイド（Devin/Claude Code用）
- [llm-units.md](agents/llm-units.md) - 各LLMユニット定義・パフォーマンス

### jobs/ - Cloud Run Jobs
- [job-catalog.md](jobs/job-catalog.md) - 全Jobの一覧・スケジュール・役割

### archive/ - 旧仕様書
過去バージョンの仕様書。参照のみ。