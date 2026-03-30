# MAGI System v4.2 重要ポイント
最終更新: 2026-03-17

## システム現状
- 取引ユニット: 7つ（SOPHIA-5/Mistral, MELCHIOR-1/Gemini, ANIMA/Groq, CASPER/DeepSeek, QWEN/Qwen, BALTHASAR/xAI, ORACLE/Together）
- OpenAI Job: 追加済み（2W 0L）
- ガードシステム: L1-L7（7層）
- 取引実績: 約80件（WIN+LOSE）
- 次のマイルストーン: 150件到達でOptuna再最適化

## 7層ガード閾値
- L2: confidence < 19.7%
- L5: winProb < 49.0%（ISABEL embedding）
- L7: 複合スコア < 67.4
- L7公式: 0.309*dirWR + 0.369*symWR + 0.173*conf + 0.149*reasoning
- コールドスタートバイパス: 評価済み10件未満はL7スキップ

## 発見済みパターン
- Groq BUY: 100%勝率 → 許可
- Mistral SELL: 100%勝率 → 許可
- Together SELL: 90%勝率 → 許可
- Together BUY: 22.7% → L4ブロック
- Groq SELL: 25% → L4ブロック
- 強い銘柄: META(88.9%), MSFT(100%), AAPL(68.4%)
- 除外銘柄: GOOGL, IWM
- 最適思考長: 50-150文字

## あかの記憶の仕組み
- 長期記憶: ~/.openclaw/memory/main.sqlite（SQLite RAG）
- システムプロンプト: BoxメモリファイルID 2162499766905
- OpenClawが6000トークン到達時に自動フラッシュ
- MDファイルは存在しない

## moomoo OpenAPI（実装予定）
- 実装タイミング: 150取引 + Optuna再最適化後
- OpenDをARIEL（Mac mini）で起動
- Tailscale経由でCloud Runから接続
- 米国株LV1はNasdaq Basic購入が必要
- レート制限: APIごとに異なる（例: 30秒60回）
- 初期購読クォータ: 100（9銘柄には十分）
