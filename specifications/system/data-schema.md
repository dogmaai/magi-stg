# BigQuery テーブル定義

Dataset: `screen-share-459802.magi_core` (US region)

## 主要テーブル

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

### optuna_results
Optuna最適化結果。L2/L5/L7パラメータ。
- run_id, created_at, win_rate, total_trades, params (JSON)

## ビュー
- trades_active: tradesのクリーンビュー
- thoughts_active: thoughtsのクリーンビュー

## 注意事項
- magi_coreはUSリージョン
- magi_analyticsはasia-northeast1リージョン
- 異なるリージョン間のJOINは不可