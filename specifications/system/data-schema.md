# ECHIDNA — BigQuery データ基盤

最終更新: 2026-05-29

**ECHIDNA（エキドナ）** は MAGI の BigQuery データ基盤全体の統一名称である。
GCP プロジェクト `screen-share-459802` 上の全データセット・テーブル・ビューを包含する。

---

## データセット一覧

### US region（メイン）

| データセット | テーブル/ビュー数 | 用途 |
|---|---|---|
| `magi_core` | 48+ | メインデータセット（思考・取引・ガード・ISABEL・HERMES 等） |
| `magi_analytics_us` | 2 | VIX 分析（symbol_vix、vix_comparison） |
| `magi_trading` | 4 | 取引パフォーマンス（daily_performance、positions、signals、trade_history） |
| `magi` | 6 | 初期テーブル群（ai_weights、decisions、fundamentals 等） |

### asia-northeast1 region（分析・レガシー）

| データセット | テーブル/ビュー数 | 用途 |
|---|---|---|
| `magi_analytics` | 13 | 文書ベクトル・LLM 分析（document_vectors、llm_analysis 等） |
| `magi_ac` | 13 | 旧 Analytics Center データ |
| `magi_analysis` | 1 | 個別分析（stock_ai_analysis） |
| `magi_data` | 1 | 分析ベクトル |

**注意**: US / asia-northeast1 間の cross-region JOIN は不可。

---

## magi_core 主要テーブル

### trades
取引記録。評価済み結果を含む。
- session_id, timestamp, symbol, side, qty, price
- llm_provider, unit_name, result (WIN/LOSE/HOLD)
- pnl_amount, pnl_percent, exit_price, exit_timestamp
- atr_at_execution, prompt_version

### thoughts
LLMの思考ログ。tradesとsession_id+symbol+llm_providerで結合。
- session_id, symbol, llm_provider, unit_name
- reasoning, hypothesis, confidence, concerns, action
- vix_estimate, vix_regime

### thought_embeddings
Cohereによる思考ベクトル(1024次元)。
- session_id, symbol, llm_provider
- embedding (FLOAT64 REPEATED)

### market_indicators
VIXデータ。magi-vix-oracleが毎日書き込む。
- id, collected_at, date, vix_value, vix_regime, source

### gemini_pattern_analysis
Gemini 2.5 Flashによる日次パターン分析。
- analysis_id, analyzed_at, trade_count_win, trade_count_lose
- full_analysis, model_version, prompt_tokens, output_tokens

### optuna_params
Optuna最適化パラメータ。L2/L5/L7パラメータ。
- run_id, created_at, win_rate, total_trades, params (JSON)

### pre_trade_intelligence
HERMES:BRAVE の収集結果。
- symbol, timestamp, sentiment_score, source

### market_research
HERMES:MARKET_RESEARCH の蓄積先。
- research_type, symbol, content, timestamp

### isabel_l4_patterns
ISABEL L4 パターンテーブル。
- pattern_id, symbol, pattern_type, win_rate

### isabel_analysis / isabel_briefings / isabel_daily_cache
ISABEL 分析結果・ブリーフィング・日次キャッシュ。

### lilith_hard_gate_events
LILITH ハードゲート発動記録。
- timestamp, symbol, original_action, gated_action, vix_regime, lilith_version

### その他
- `consensus_signals`: コンセンサスシグナル
- `constitution`: MAGI Constitution テーブル
- `llm_health_checks`: PLM ヘルスチェック
- `llm_config` / `llm_metrics`: LLM 設定・メトリクス
- `vix_defense_log` / `vix_snapshots`: VIX 防衛ログ・スナップショット
- `service_endpoints`: サービスディスカバリ
- `sessions`: セッション管理
- `portfolio_snapshots`: ポートフォリオスナップショット
- `l4_probation`: L4 プロベーション
- `stale_phrases`: ステイルフレーズ検出

## ビュー
- `trades_active`: trades のクリーンビュー（DELETE/INSERT 不可）
- `thoughts_active`: thoughts のクリーンビュー
- `trades_shadow` / `thoughts_shadow`: シャドウビュー
- `isabel_trade_analysis`: ISABEL 取引分析ビュー
- `trade_results`: 取引結果ビュー
- `symbol_change_rates`: 銘柄変動率ビュー

---

## Schema 注意事項

- `thoughts`: `reason`（not `reasoning`）、`pnl_percent`（not `return_pct`）、`confidence` カラム無し
- `trades_active`: VIEW のため DELETE/INSERT 不可
- 全クエリで `--use_legacy_sql=false --location=US --project_id=screen-share-459802` 必須
- `unit_name=NULL` のレコードは訓練データとして無価値、構造的に許容しない（SI-2 修正 PR #134 以降）
