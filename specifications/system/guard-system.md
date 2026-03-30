# 7層ガードシステム

取引実行前に順番に評価。いずれかで拒否されると取引は不実行。

| Layer | 名称 | 条件 | 最適化 |
|---|---|---|---|
| L1 | データ検証層 | side/qty/symbol NULL | - |
| L2 | 確信度層 | confidence < 19.7% | Optuna |
| L3 | 銘柄除外層 | GOOGL, IWM | データ駆動 |
| L4 | 方向適性層 | win_rate <= 30% かつ loses >= 3 | データ駆動 |
| L5 | パターン判定層 | ISABEL winProb < 49.0% | Optuna |
| L6 | VIX防御層 | EXTREME_FEAR/PANIC → BUY禁止 | - |
| L7 | 総合判定層 | 複合スコア < 67.4 | Optuna 1000-trial |

## L7 複合スコア

```
score = 0.309 * directionWR + 0.369 * symbolWR + 0.173 * confidence + 0.149 * reasoningScore
```

閾値: 67.4
バックテスト: 38W 0L (100%)

## コールドスタートバイパス

評価済み取引 < 10件のLLMはL7をバイパス。10件到達で自動有効化。