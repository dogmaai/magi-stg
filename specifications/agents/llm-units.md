# LLMユニット定義

最終更新: 2026-04-26

## ユニット別パフォーマンス（2026-04時点）

| ユニット | Provider | モデル | 状態 | 方向別特性 | 思考品質 | ISABEL有効性 |
|---|---|---|---|---|---|---|
| SOPHIA-5 | Mistral | mistral-small-latest | ACTIVE | SELL 100%勝率 | 中 | 高 |
| MELCHIOR-1 | Google Gemini | gemini-2.5-flash | ACTIVE | データ品質問題あり | 低〜中 | 低 |
| ANIMA | Groq | llama-3.3-70b-versatile | ACTIVE | BUY 100%勝率、SELL不可 | 低 | 低 |
| CASPER | DeepSeek | deepseek-chat | ACTIVE | 全LOSE（リスク管理者ペルソナ偏向） | 中 | 低 |
| LILITH | Qwen (Alibaba) | qwen-plus | ACTIVE | 詳細だが冗長（385-439文字） | 高 | 中 |
| ZEROEL | xAI | grok-4-1-fast | PAUSED | 構造化高品質分析 | 高 | 高 |
| ORACLE | Together | Llama-4-Maverick-17B-128E-Instruct-FP8 | PAUSED | SELL 90%勝率、BUY不可 | 中 | 中 |
| PROMETHEUS | OpenAI | gpt-4o-mini | JOB-ONLY | （Scheduler 未作成） | - | - |
| TIARA | Ollama @ TIALA | qwen2.5:14b | ACTIVE | 観察中（2026-04-26 PoC開始） | 中 | 中 |

### ユニット名の改名履歴

| 改名前 | 改名後 | 改名日 | 備考 |
|---|---|---|---|
| MINERVA | LILITH | - | qwen-plus PLM |
| BALTHASAR | ZEROEL | - | xAI grok-4-1-fast |
| CHERUB | PROMETHEUS | - | OpenAI gpt-4o-mini |

### 未稼働ユニット

| ユニット | Provider | 状態 |
|---|---|---|
| SERAPH | Kimi | config登録済・Job未作成 |

## 月額コスト（2026-03実績）

| Provider | 月額 |
|---|---|
| Qwen (LILITH) | $1.43 |
| Together (ORACLE) | $0.78 |
| Groq (ANIMA) | $0.72 |
| xAI (ZEROEL) | $0.53 |
| DeepSeek (CASPER) | $0.35 |
| Mistral (SOPHIA-5) | $0.31 |
| Google Gemini (MELCHIOR-1) | $0.15 |
| Cohere (ISABEL) | ~$0.03 |
| Gemini Analyzer | ~$0.11 |
| Ollama @ TIALA (TIARA) | $0.00 (ローカル推論) |
| **合計** | **~$4.41** |

## ハードウェア / インフラ対応

| ユニット | 推論実行場所 |
|---|---|
| SOPHIA-5 / MELCHIOR-1 / ANIMA / CASPER / LILITH / ZEROEL / ORACLE / PROMETHEUS | クラウドAPI |
| **TIARA** | **TIALA (Mac mini M4 16GB, Tailscale 100.114.185.1, port 11434)** |

注: TIALA はハードウェア名（末尾LA）、TIARA は PLM ユニット名（末尾RA）。L/R 1文字違いのため混同厳禁。

## VIX-Correlated Watchlist 対応状況（2026-04-26 追加）

| ユニット | Watchlist 注入 | 備考 |
|---|---|---|
| TIARA | YES (Phase 1 PoC) | 2026-04-26〜、20銘柄/4カテゴリ |
| 他8ユニット | NO | Phase 2 で展開判断 |

詳細は `constitution.md` の "VIX-CORRELATED WATCHLIST FRAMEWORK" セクションを参照。
