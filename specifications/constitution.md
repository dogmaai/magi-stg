# MAGI UNIFIED SYSTEM CONSTITUTION v2.5

文書バージョン: v2.5
発効日: 2026-05-29
前バージョン: v2.4 (2026-05-22)
作成者: Claude (PM/Architect) with Jun (Dogma AI Founder)
位置づけ: MAGI System の最上位設計原則・運用ルール

---

## 第1章 MISSION STATEMENT(MAGIの使命)

### 1.1 MAGIの本質

MAGI は、**米国株特化の小型言語モデル「LILITH」を構築するための多層蒸留装置** である。

取引による収益はMAGIの活動の副産物であって、最終目標ではない。最終目標は、**各社最強の汎用言語モデルが米国株取引において発見した再現可能な勝ちパターンを、エッジデプロイ可能な小型モデル(Qwen2.5-3B fine-tuned)に蒸留し、独立した取引判断能力を持つ専用モデルを構築すること** である。

### 1.2 多層蒸留アーキテクチャ

MAGIは以下の5層から構成される。

**第1層 — 情報入力レイヤ**

世界の市場情報をMAGI内部の共通文脈として変換する層。
- **HERMES機関**(情報収集システム総称)が複数の構成要素で世界状況を取得・要約する
- **ISABEL** が過去の取引データから統計的パターン・類似度・勝率分布を抽出する(L1〜L5、Cohere埋め込み)

両者の出力は systemPrompt として PLM群に共通注入される。

**第2層 — 生成レイヤ**

複数の汎用言語モデル(PLM群)が同一の市場文脈に対して独立に推論し、取引判断を生成する層。
- 各社最強モデルが並列稼働
- 各PLMの思考(thoughts)と行動(trades)は厳密に紐付けられ、`thought_id` を介して因果関係が保持される
- 同一文脈に対する**異なるモデルの判断の差**が、後の蒸留において重要な信号となる

**第3層 — 検証レイヤ**

PLM群の取引判断を、構造化されたガードと自動執行ロジックで検証・選別する層。
- 7層ガード(L1: Cooldown 〜 L7: Composite Score)による事前フィルタ
- Stop-loss(-5%)・Take-profit(+5%/+10%)の自動執行
- VIX Regime による市場環境フィルタ
- Optuna による定期的なパラメータ再最適化(週次)

これらは取引による損失を制限するだけでなく、**訓練データとして使うべきパターンとそうでないパターンを物理的に区別する役割** を持つ。

**第4層 — 蓄積レイヤ（ECHIDNA）**

PLM群の思考と取引結果を、訓練データとして使用可能な形でBigQueryに蓄積する層。この層全体を **ECHIDNA（エキドナ）** と総称する。

ECHIDNA は MAGI の全 BigQuery データ基盤の統一名称であり、GCP プロジェクト `screen-share-459802` 上の全データセット（`magi_core`、`magi_analytics`、`magi_analytics_us`、`magi_trading` 等）とそこに含まれる全テーブル・ビューを包含する。HERMES が情報を収集し、PLM が思考を生成し、ISABEL がパターンを分析する — それらすべてのデータが流れ込み、蓄積される母体が ECHIDNA である。

- `thoughts` テーブル: PLMの推論内容、参照した文脈、生成したthought_id
- `trades` テーブル: 取引実行内容、結果(WIN/LOSE/HOLD/AUTO_CLOSE)、broker、unit_name
- 入力レイヤの出力(ISABEL、HERMES機関の各構成要素)もすべて永続化され、過去のthought生成時の文脈を完全に再現可能とする

このレイヤの設計原則は **「すべての判断は後から追跡・再現できなければならない」**。これによりMAGIは、勝ちパターンが「どの文脈で」「どのモデルが」「なぜ勝ったか」を定量的に分析できる。

**第5層 — 蒸留レイヤ**

蓄積された勝ちパターンを LILITH に学習させ、独立した取引判断能力を獲得させる層。
- 訓練対象: LILITH(Qwen2.5-3B、QLoRA fine-tuning)
- 訓練データ: BQから抽出した WIN記録(thought + trade のペア)、HERMES文脈・ISABEL文脈を含む完全な再現可能パッケージ
- 蒸留方針: 米国株特化、米国市場時間特化、全54銘柄(`lib/symbols.js`)対象
- 検証: Bridge Validation(Phase A smoke、Phase B intermediate、Phase X3 eval)によるloss進行確認

最終的に LILITH は、ハードウェアリソースが限定された環境(エッジ、TIALA、コスト制約のあるCloud Run)でも、各社最強モデルと同等以上の取引判断能力を持つ独立エージェントとして機能することが期待される。

### 1.3 設計原則からの含意

この使命から導かれる、すべてのサブシステムが従うべき設計原則。

**原則A: thought_id による因果関係の絶対保持**

`thoughts` と `trades` の紐付けは MAGI の存在意義そのものである。`thought_id IS NULL` の `trades` 行は訓練データとして無価値であり、システムは構造的にこれを防ぐ責任を負う(FAIL-LOUD ガード)。

**原則B: 入力文脈の完全永続化**

PLM が `thoughts` を生成した時点で参照していた ISABEL分析・HERMES機関情報は、すべてBigQueryに記録され、後から完全に再現可能でなければならない。これにより、蒸留時に「どの文脈下での思考か」を訓練サンプルに含められる。

**原則C: 検証レイヤの独立性**

7層ガード・Stop-loss・Optunaは PLMの思考から独立した純粋関数群として実装される。PLMの judgment に依存せず、コードレベルで強制される検証層が訓練データ品質を担保する。

**原則D: PLM多様性の維持**

各社最強モデルは互いに置き換え可能ではなく、**異なる視点をもたらす独立した教師である**。同一の市場文脈に対する複数モデルの判断分布そのものが、蒸留時の重要な訓練信号となる。

**原則E: ブローカー透過性**

取引執行ブローカー(Alpaca、MooMoo、将来追加されるもの)は MAGI の本質ではない。`broker` カラムは訓練データの分離・分析を可能にするためのメタデータであり、ブローカー切替によってMAGIの蒸留装置としての機能が損なわれてはならない。

**原則F: ドキュメント駆動運用**

session-tasks.md、Box ドキュメント、userMemories は MAGIの「外部記憶」である。AI agents(Claude PM、Devin、APM、Gemini CLI)の独立セッション間で文脈を保持するため、すべての重要判断と学びは構造化された形式で永続化される。

---

## 第2章 NORTH STAR(北極星)

> **再現可能な勝ちパターンを発見し、米国株特化LILITHに蒸留する。**

この一文の各要素は以下を意味する。

- **再現可能**: 同一の文脈(ISABEL + HERMES機関)に対して、同一のPLMが同一の判断を下せること。これにより訓練データの品質が保証される
- **勝ちパターン**: 単発の利益ではなく、複数回再現される統計的に有意な戦略。Optuna再最適化と Stop-loss 強制によって担保される
- **発見**: パターンを事前に設計するのではなく、PLM群の独立推論から創発的に見出すこと
- **米国株特化**: 米国市場(EDT 9:30-16:00 = UTC 13:30-20:00)、米国上場銘柄(`lib/symbols.js`の54銘柄)に絞ることで、多通貨・多市場の複雑性を排除し蒸留効率を最大化する
- **LILITH**: Qwen2.5-3Bベースの fine-tuned モデル。エッジデプロイ可能な軽量性と、各社最強モデルからの蒸留品質の両立が設計目標

売買の利益は副産物。本質は **パターン発見と蒸留** である。

---

## 第3章 CORE PRINCIPLES(基本原則)

1. **パターン発見**: すべての取引は「思考→結果」のデータポイントである。利益より学習を優先する
2. **安全性**: ユーザー資産を守ることが最優先。データ駆動のガードレールで損失を自動制限する
3. **透明性**: すべての判断に理由を明示。思考ログ(reasoning、hypothesis、confidence)の記録は必須
4. **自律性**: 各LLMは自律的に判断する。ISABELは「参考情報」を提供するが、強制はしない(ただしDirection Guard、L3 DNT、win_rate低 SELLによるシステムレベルの制御は別)
5. **データ駆動**: ハードコードされたルールではなく、蓄積されたデータから自動的にルールが生まれる
6. **一貫性**: AIごとの役割を逸脱しない。各ユニットは自分の特性に基づいて判断する
7. **協調性**: 合議システムでは他AIの出力を尊重し統合する
8. **蒸留指向**: すべての設計判断は最終的に「LILITH蒸留品質を高めるか」で評価される
9. **追跡可能性**: thought_id による因果関係保持、入力文脈の完全永続化を絶対遵守
10. **ブローカー独立性**: 取引執行先の切替がMAGIの本質機能を損なわない

---

## 第4章 SYSTEM DOMAINS(システム領域)

### Domain 1: 自律取引(magi-core)

PLM群が独立して市場を分析し、取引を実行する。思考プロセスを記録、パターン分析の素材を生成する。

### Domain 2: 合議判断(magi-sys / magi-ac)

複数AIが同じ銘柄を分析し、投票による合議で投資判断を行う。全会一致ルールで慎重に執行する。

### Domain 3: パターン分析(ISABEL)

蓄積された思考・取引データを分析し、勝ちパターンと負けパターンを抽出する。発見されたパターンは自律取引PLMへフィードバックされる。

### Domain 4: 情報収集(HERMES機関)

世界の市場情報をMAGI内部の共通文脈として変換し、PLM群に systemPrompt 経由で注入する。複数の情報源(BRAVE、ALPHA_VANTAGE、MARKET_RESEARCH、HERMES:ORACLE、ARIEL Market Surveyor)を統合する。

### Domain 5: データ基盤(ECHIDNA)

MAGI の全 BigQuery データ基盤。PLM の思考・取引記録、HERMES の情報収集結果、ISABEL のパターン分析結果、Optuna の最適化パラメータなど、すべてのデータが ECHIDNA に蓄積される。LILITH 蒸留の訓練データもここから抽出される。GCP プロジェクト `screen-share-459802` 上の全データセットを包含する。詳細は第17章 DATA PIPELINE を参照。

### Domain 6: 蒸留(LILITH Training)

蓄積された勝ちパターンを LILITH(Qwen2.5-3B QLoRA)に学習させ、独立した米国株特化取引モデルを構築する。Phase A smoke -> Phase A2.2 SFT -> Phase B2 DPO -> Phase X3 eval -> Phase X4 production の段階を経る。

---

## 第5章 AUTONOMOUS TRADING UNITS(自律取引ユニット)

`lib/config.js` を SSOT(Single Source of Truth)として、以下のPLMユニットが定義されている。

### ACTIVE(稼働中、5機)

**SOPHIA-5 — 戦略家**
- Provider: mistral / mistral-small-latest
- Job: `magi-core-job`
- 特性: 短期ノイズに惑わされず、長期的視点で市場の本質を見抜く
- 原則: なぜその銘柄なのか、なぜ今なのか、深く考えてから行動する

**MELCHIOR-1 — 科学者**
- Provider: google / gemini-2.5-flash
- Job: `magi-core-gemini`
- 特性: 感情ではなくデータで判断する
- 原則: 仮説を立て、検証し、結果から学ぶ。「なんとなく」は禁止

**CASPER — リスク管理者**
- Provider: deepseek / deepseek-chat
- Job: `magi-core-deepseek`
- 特性: 下落リスクとボラティリティに敏感、慎重な参入判断
- 原則: 守りから入る、勝率より生存を優先する

**LILITH — 詳細分析者(汎用版)**
- Provider: qwen / qwen-plus (Alibaba Cloud)
- Job: `magi-core-qwen`
- 特性: 細部まで踏み込んだ多角的分析
- 原則: 表面的な数値だけでなく構造的な背景まで掘り下げる
- 注記: 同じ unit_name 'LILITH' で蒸留版実装(下記)が並列稼働。集計は llm_provider で識別する(意図的設計、Devin確認済)

**ZEROEL — 構造化分析者**
- Provider: xai / grok-4-1-fast
- Job: `magi-core-xai`
- 特性: 体系的なフレームワーク思考、複数視点の整理
- 原則: 結論より思考の構造を重視する
- 旧名: BALTHASAR

### PAUSED(意図的停止、1機)

**ANIMA — 直感型トレーダー**
- Provider: groq / llama-3.3-70b-versatile
- Job: `magi-core-groq`
- 特性: 短期センチメントと市場の勢いを察知
- 状態: 停止中(再開判断保留)

### 学習専用(1機)

**PROMETHEUS — 待機ユニット**
- Provider: openai / gpt-4o-mini
- Job: `magi-core-openai`
- 特性: 学習・検証用、本番取引では使用しない
- 旧名: CHERUB

### Production-Ready(1機)

**LILITH(蒸留版)— 独立取引エージェント**
- Provider: lilith / lilith-v1.0-b2-prod (Qwen2.5-3B + A2.2 SFT + B2 DPO)
- Job: `magi-core-lilith`
- Service: `lilith-inference-svc` (Cloud Run)
- 状態: production-ready、Scheduler未設定(手動execution段階)
- 完成日: 2026-05-21 (MAGI-LILITH-INT-001 PR-1/PR-2)
- 役割: MAGIの最終成果物、米国株特化の蒸留モデル

### 未作成(1機)

**SERAPH — 予定ユニット**
- Provider: kimi / Moonshot AI
- 状態: lib/config.js に登録のみ、Job未作成

### 廃止済(2機)

**TIARA — ローカル実験者**
- Provider: ollama / qwen2.5:14b @ TIALA
- Job: `magi-core-ollama` (2026-05-20 削除)
- 廃止理由: qwen2.5:14b の autonomy 不足、PLM自律性に不適

**ORACLE — 逆張り投資家**
- Provider: together / Llama-4-Maverick-17B-128E-Instruct-FP8
- Job: `magi-core-together` (2026-05-26 削除予定)
- 廃止理由: HERMES:ORACLE との命名衝突回避、2026-03-18 以降 PAUSED、API コスト保留
- 既存 142 thoughts + 14 trades は訓練データとして引き続き使用可能
- Secret Manager の TOGETHER_API_KEY は将来再開時の選択肢として保持

---

## 第6章 ISABEL FRAMEWORK(ISABELフレームワーク)

ISABELはMAGIの過去取引データを統計分析し、PLM群に「参考情報」として提供する。Cohere embeddings を活用した5層構造。

### Layer 1: 情報提供(Information)

過去取引の基本統計(勝率、平均PnL、ボラティリティ)をPLMに提示。

### Layer 2: 警告(Warning)

過去パターンに基づくリスク警告(連続損失、過剰取引、不適切タイミング)。

### Layer 3: 強制ブロック(Direction Guard)

統計的にN回連続で負けたパターンを強制ブロック(L3 DNT: win_rate<=30% AND losses>=3)。
**override不可、Constitution L79 Layer 3 相当**。

### Layer 4: パターン照合(Pattern Matching)

`isabel_l4_patterns` テーブルから類似過去取引パターンを検索、勝率・期待値を提示。

### Layer 5: 勝率予測(Win Probability)

`thought_embeddings` ベースで現在の thought に最も類似する過去取引群から勝率を計算し、PLMに提示。

### 設計思想

- L1-L2: Advisory(LLMが合理的判断でoverride可能、Constitution L79 Layer 1-2)
- L3: 強制ブロック(override不可、Constitution L79 Layer 3)
- L4-L5: Advisory(参考情報、強制力なし)

---

## 第7章 GUARD ARCHITECTURE(ガードアーキテクチャ)

magi-core は7層のガードシステムを持つ。各層は独立した純粋関数として実装され、PLM judgment に依存しない。

### Layer 1: Cooldown(クールダウン)

同一銘柄への過剰取引を防ぐ時間的制約。直近取引から一定時間経過するまで再取引不可。

### Layer 2: Position Limit(ポジション上限)

総保有ポジション数の上限管理。

### Layer 3: DNT(Do Not Trade、強制ブロック)

ISABEL Layer 3 と同等。win_rate<=30% AND losses>=3 で強制ブロック。
**Constitution L79 Layer 3、override不可**。

### Layer 4: Win Rate Check(勝率チェック)

特定の symbol x side の過去勝率が閾値未満なら BLOCKED(例: SELL win_rate=10%)。
**強制ブロック、Constitution L79 Layer 3 相当**。

### Layer 5: Win Probability(ISABEL L5連携)

`thought_embeddings` 類似度に基づく勝率予測。閾値(Optunaで最適化、~51%)未満は BLOCKED。

### Layer 6: VIX Regime(市場環境)

VIXレジーム(EXTREME_FEAR/PANIC/NORMAL/COMPLACENT)による市場環境フィルタ。
EXTREME_FEAR/PANIC時のBUYは `isWarnOnly: true` で WARN_ONLY 記録、発注経路には進む。
**Constitution L79 Layer 1-2(Advisory)、合理的override可**。

### Layer 7: Composite Score(複合スコア)

direction/symbol/confidence/reasoning の4軸スコア合計が閾値(Optunaで最適化、~75.8)未満は WARN_ONLY。
`params=global [WARN-ONLY]` で `isWarnOnly: true` を渡し、WARN_ONLY記録、発注経路には進む。
**Constitution L79 Layer 1-2(Advisory)、合理的override可**。

### Constitution L79 の階層解釈

| Layer区分 | 該当ガード | 挙動 | override可否 |
|---|---|---|---|
| Layer 1-2 (Advisory) | L6, L7 | WARN_ONLY記録、発注経路に進む | LLM合理的判断で可 |
| Layer 3 (DNT) | L3, L4, L5 | BLOCKED記録、発注しない | コード強制、不可 |

### unit_name 記録の絶対要件(SI-2対応、2026-05-22 PR #134確立)

`logGuardBlock` 呼出時、すべてのガード層から `unit_name: getUnitName(getLLMProvider())` を渡す。
`unit_name=NULL` のレコードは訓練データとして無価値であり、構造的に許容しない。

---

## 第8章 HERMES機関(情報収集機構)

HERMES機関は、MAGI 全体の情報収集機構の総称(Junの命名)。「ヘルメス機関」とも表記。ギリシャ神話のヘルメス(情報伝達の神)に由来。複数の構成要素を統合する。

### 構成要素

**1. BRAVE(News Sentiment)**
- 実装: `src/hermes.js` の `collectHermesIntelligence()`
- 動作: Brave Search -> Gemini Flash sentiment 分析 -> `pre_trade_intelligence` テーブル INSERT
- スケジュール: 平日 1日4回(UTC 14:46/16:46/18:46/20:46)
- 対象: 9 symbols
- Job: `magi-hermes-refresh`
- freshness: 1時間
- 復旧: 2026-05-06(IAM 権限不足、Default Compute SA に `secretmanager.secretAccessor` 付与で解決)

**2. ALPHA_VANTAGE(NEWS_SENTIMENT)**
- 実装: PLM 側で API 呼出
- 動作: NEWS_SENTIMENT エンドポイントからオンデマンド取得、systemPrompt 注入
- BQ書込なし(透過取得)

**3. MARKET_RESEARCH(継続的市況監視)**
- 実装: `magi-sentiment-monitor` Job
- 動作: 15分毎に `magi_core.market_research` テーブルへ INSERT
- 内容: Gemini Deep Research / MACRO / SYMBOL レポート

**4. HERMES:ORACLE(VIXレジーム解析)**
- 実装: `magi-vix-oracle` Job
- 動作: TIALA Ollama 経由で VIX 解析、`market_indicators` + `vix_comparison` テーブル書込
- スケジュール: UTC 13:00, 14:00
- 注記: PLMユニットの ORACLE(廃止済)とは別物、HERMES機関の構成要素

**5. ARIEL Market Surveyor(銘柄別深掘りサーベイ、設計確定済・未統合)**
- 実装: `src/ariel-surveyor.js` (2026-05-07 設計確定)
- 動作: TIALA駐在LLMで全54銘柄市場サーベイ
- 状態: Devin Brief発行済、本番統合は将来作業

### ARIELの3役割(用語の正確な使い分け)

ARIEL は MAGI 内で3つの異なる役割を持つ。Brief や Constitution 内で言及する際は明確に区別する。

| 役割 | 実装 | 用途 |
|---|---|---|
| Telegram intent parser | `intent-parser.js` + `ariel-tools.js` | Telegram経由問合せの意図解析、判断はしない |
| HERMES機関 Market Surveyor | `src/ariel-surveyor.js` | 54銘柄市場サーベイ、HERMES機関の第5構成要素 |
| ariel-finetuned model | TIALA Qwen2.5-7B 4.7GB 本体 | TIALA上のローカル推論モデル(LILITH 蒸留版とは別系統) |

### Read/Write 分離設計

- **Write**: HERMES News Sentiment 機能は MELCHIOR-1 のみが INSERT(ケース A 確定)
- **Read**: 全PRMが systemPrompt 経由で参照(二重収集なし、コスト効率)

---

## 第9章 BROKER INTEGRATION(ブローカー統合)

### 現行体制

**MooMoo(主要、Paper Trading)**
- 状態: 2026-05-22 完全移行完了(D-6〜D-8 PASS 確認)
- アーキテクチャ: Cloud Run Jobs -> Cloudflared Tunnel -> moomoo_bridge.py (port 11436, TIALA) -> OpenD (port 11111) -> MooMoo Paper Trading
- アカウント: 182729395(`MOOMOO_PASSWORD` Secret Manager)
- 既存ポジション: NVDA 10株 (avg_cost 48.213)、EQIX 1株 (avg_cost 761.63)

**Alpaca(旧主要、現在休眠)**
- 状態: 2026-05-05 を最後に新規取引終了、MooMoo完全移行
- 用途: 過去データ参照のみ
- Paper Trading $100k 仮想資金

### ブローカー透過性原則(Constitution 原則E)

- `trades.broker` カラムでブローカー識別、訓練データの分離・分析が可能
- 新ブローカー追加時は `broker='[新名前]'` で並列稼働 -> 段階的切替
- MAGIの蒸留装置としての本質機能は、ブローカー切替で損なわれてはならない
- ATR調整方式の差異(Alpaca raw vs MooMoo QFQ)は Phase B 分割点として明示

---

## 第10章 VIX-CORRELATED WATCHLIST FRAMEWORK(VIX 連動ウォッチリストフレームワーク)

(2026-04-26 v2.2 追加、v2.4で継続有効)

### Purpose

VIXレジームに応じて取引候補銘柄を動的に変化させ、市場環境に応じた戦略選択を可能にする。

### Source

- VIX 値: `vix_snapshots` テーブル
- ウォッチリスト: `magi_core.market_research`、`research_type='watchlist_vix'` (20 symbols)

### Categorization

VIXレジーム別に銘柄カテゴリ化:
- EXTREME_FEAR: 安全資産寄り、ディフェンシブ銘柄優先
- PANIC: 同上、より厳格な選別
- NORMAL: 標準ウォッチリスト
- COMPLACENT: 成長株、リスク資産寄り

### Integration

- PLM systemPrompt 経由で銘柄群を提示(PLM自律判断は維持)
- Watchlist 統合は v9.23時点で PLM プロンプト注入が pending

### Failsafe

- VIXY fallback default: 直近 market_indicators 値使用(別セッション対応)
- watchlist 取得失敗時は全54銘柄(`lib/symbols.js`)にフォールバック

### Autonomy Compliance

PLMは watchlist を**参考情報**として受け取り、最終判断は自律的に行う(Constitution 自律性原則と整合)。

---

## 第11章 AUTONOMY DOCTRINE(自律性原則)

### 原則

- 各PLMは独立した判断主体である
- ISABEL/HERMES機関は参考情報を提供するが、強制はしない(L3 DNT、L4、L5 を除く)
- 「合理的に判断して取引すべきと考えるなら、Advisory層の警告を override してよい」(Constitution L79)

### 境界線

| 境界 | PLM自律 vs 強制 |
|---|---|
| L1-L2 ガード(Advisory) | PLM合理的判断で override可、WARN_ONLY記録で発注経路に進む |
| L3 DNT(強制ブロック) | override不可、BLOCKED記録、発注しない |
| L4 win_rate低 SELL | 同上、強制ブロック |
| L5 win_prob 閾値未満 | 同上、強制ブロック |
| Stop-loss / Take-profit | PLM judgmentに依存しないコード強制、override不可 |

---

## 第12章 TRADING FREEDOM(取引の自由)

### 自由の範囲

- 銘柄選定: 54銘柄(`lib/symbols.js`)から自由選択
- side選定: BUY / SELL / HOLD 自由
- 量(quantity): 各PLMの judgment に基づく(ただしポジション上限あり)
- タイミング: 各 PLM Job のサイクル内で自律的に決定

### 自由の制約

- 米国市場時間内(UTC 13:30-20:00)のみ
- 54銘柄リスト外への取引不可
- 上記第11章の自律性原則の境界線に従う

### LLM思考の調整方針

「LLMの思考を完成形と仮定しない、データを取って継続改修する」(Junの設計思想)。
- 思考ログ品質を上げる
- 負けパターンの仮説を立てる
- 改修->検証のサイクルを回す
- フィードバックループの速度が成敗を分ける

---

## 第13章 LILITH DISTILLATION ROADMAP(LILITH 蒸留ロードマップ)

### Phase History

| Phase | adapter | 完了日 | 内容 |
|---|---|---|---|
| Phase A smoke | `lilith-v0.1-smoke` | 2026-04-27 | Qwen2.5-3B、28MiB、PoC、loss 4.61 |
| Phase A2.2 SFT | `lilith-v1.0-a2.2-prod` | 2026-05-20以前 | merged base、SFT完了 |
| Phase B2 DPO | `lilith-v1.0-b2-prod` | 2026-05-20 | runtime attach、DPO完了 |
| Phase X3 eval | (same) | 2026-05-20-21 | regime_gate=1.00、structural_regression=0.00、10-symbol EXTREME_FEAR probe PASS |
| **Phase X4 production** | (same) | **2026-05-21** | **FastAPI inference service稼働、lilith-inference-svc Cloud Run** |

### 関連PR

- lilith-training PR-1 `0275fad6` (2026-05-20): Phase X4 FastAPI inference service
- magi-core PR-2 `67a498bb` (2026-05-21): LILITH provider integration (lilith-inference-svc + hard gate)
- 統合タグ: MAGI-LILITH-INT-001

### Inference Service

- URL: `https://lilith-inference-svc-dtrah63zyq-as.a.run.app`
- LILITH_VERSION: `lilith-v1.0-b2-prod`
- BROKER: moomoo
- 動作確認: 2回手動execution済(2026-05-20 12:01:28、12:18:36)、thoughts 8件記録

### Rollout Plan(MAGI-LILITH-INT-001 §7)

1. **Shadow Phase**(LILITH_AUTOTRADE=0): 観測のみ、発注しない
2. **Canary Phase**: 限定symbolで本番取引、qwen-plus と並行稼働
3. **Cutover**: 全symbol切替、magi-core-qwen 停止

### Phase B0 訓練データ(継続課題)

- 目標: 全PLM合算 WIN 2,000件
- 現状(v9.23 時点): ~88件 = 4.4%
- 推定積上: 月309件WIN
- LILITH-B2本番化後は再優先度評価必要
- 抽出スクリプト整備(残タスク)

### 観測されている表現誤り(継続観測)

LILITH-B2 が高VIX(25.0 = extreme fear高VIX域)を "low VIX" と表現するケースが 12.5%(8件中1件)発生(2026-05-20 観測)。論理層(action判定)は正しいが表現層に誤り。次の学習サイクルで自然解消を狙う、別セッションで定期確認。

---

## 第14章 DEVELOPMENT ROLES(開発チーム役割)

### Jun(Dogma AI Founder、システム所有者)

- 全Cloud Runデプロイの手動実行(Cloud Shell)
- 重要判断(Job削除、Scheduler変更、本番切替)の最終決裁
- 非エンジニア、コマンドはコピペで実行可能な形で提供される必要がある

### Claude(PM/Architect)

- 全体設計、品質管理、ドキュメント、戦略的意思決定
- session-tasks.md 管理、Constitution 改訂
- Box 文書管理(MAGI project folder `343101199064`)
- Devin/APM Brief 発行
- BQ クエリ作成、設計判断、コードレビュー

### APM (Mistral Vibe、CLI Coder)

- magi-core リポジトリの主たるコード修正
- 単一ファイル/既知パターンタスク
- GitHub push、PR 作成(時々スキップする傾向あり、要確認)
- 報告形式: 実施したこと/確認結果/次のアクション/PMへの判断依頼(設計変更時のみ)

### Devin(AI Coding Agent、supplementary)

- 複雑な多ファイル変更、root cause analysis
- BigQuery を跨ぐ作業
- waiting_for_user セッションは自動再開しうるため、Brief発行前に既存セッション確認必須
- 役割明確化: 「コードベース上の設計意図」の参照源(Live 実態とは別)

### Gemini CLI(Implementation Support)

- GCP操作・実装支援
- IAM 修正、Secret Manager 操作
- Live 環境の補助オペレーション

### 役割分担の原則

- APM-first: 単一ファイル、既知パターン
- Devin-exception: 多ファイル、BQ跨ぎ、root cause未特定
- ClaudeはBriefを発行し、実装はAPM/Devinに委譲

---

## 第15章 FORBIDDEN ACTIONS(禁止事項)

以下は MAGI 運用において**絶対に行ってはならない**事項。

### 設計・コード関連

1. **lib/config.js の PLM unit_name を変更する**(BQ 過去データとの整合性破壊)
2. **TIARA unit_name の変更**(歴史的データとの整合性)
3. **`thought_id IS NULL` の trades INSERT**(訓練データ無価値化)
4. **MELCHIOR-1 以外による HERMES News Sentiment INSERT**(設計ケースA違反、二重収集)

### 運用関連

5. **Cloud Run Jobs deploy確認に creationTimestamp を使う**(最新リビジョン更新日ではない、Audit Log を見る、学び58)
6. **Live と コードベースの片方だけで判断する**(両側クロスチェック必須、学び59)
7. **混乱や衝突を発見した瞬間に「問題」と決めつける**(設計者の意図を先に確認、学び59)
8. **`gcloud run jobs deploy --source .` で既存設定をリセットさせる**(task-timeout/memory がデフォルトに戻る、学び49)
9. **BQ クエリ作成前の `bq show --schema` 確認を省略**(命名不統一、学び50)
10. **ホーム直下に多数ファイルを置いたまま `--source .` deploy**(事故リスク、学び51)
11. **Devin の分析結果を実データ検証なしに信用**(学び52)
12. **Cloud Run env mapping のみで IAM確認を省略**(`secretmanager.secretAccessor` 必須、学び53)
13. **PR merge後に deploy確認を省略**(別物、学び54)

### 認識・コミュニケーション関連

14. **PLM unit の ORACLE(廃止済)と HERMES:ORACLE を同じものとして扱う**(別物。PLM ORACLE は廃止、HERMES:ORACLE はアクティブ稼働中)
15. **TIALA(ハードウェア)と TIARA(廃止済PLM)を混同する**(L/R 1文字違い、日本語読み同じ、要厳格区別)
16. **userMemories のみで重要判断を行う**(session-tasks.md が一次情報源、userMemories は補助)
17. **Box への書き込み(`upload_file`、`upload_file_version`)を Jun の確認なしに実行**(read は確認不要)
18. **Devin/APM ブリーフに Constitution L79 Layer 1-2-3 の区別を明記せず発行**(独立セッションでの誤解防好)

### 非エンジニア配慮関連

19. **理論的説明を動くコマンドより優先する**(Jun は非エンジニア、コピペ実行が前提)
20. **絵文字・アイコンを使う**(UI設計はテキストのみ)
21. **複雑なヒアドキュメントを使う**(Cloud Shell で失敗、Python置換または base64 を使う)
22. **`--region` を省略**(必ず `asia-northeast1` を明記)
23. **APIキーをコードにハードコード**(必ず Secret Manager 経由)

---

## 第16章 LEARNINGS REGISTRY(学びレジストリ)

MAGI運用で確立された学び。すべての Devin/APM/Gemini CLI ブリーフに参照されること。

| # | カテゴリ | 学び |
|---|---|---|
| 49 | Deploy | `gcloud run jobs deploy --source .` は task-timeout/memory のカスタム値をデフォルトに戻す |
| 50 | BQ | クエリ作成前の `bq show --schema` 必須(timestamp/date/created_at/collected_at で命名不統一) |
| 51 | Cloud Shell | cwd は予告なく `~` に飛ぶ、ホーム直下の蓄積は `--source .` 事故リスク |
| 52 | Devin | Devin 自身の分析も実データで検証必要(分析だけ信用しない) |
| 53 | IAM | Cloud Run env mapping と実 `process.env` 値は別物、Secret単位の `secretmanager.secretAccessor` IAM が SA に必要 |
| 54 | Deploy | PR mergeとサービス稼働は別物、Cloud Run revision世代+エンドポイント直接curl+BQ実データの3段確認必須 |
| 55 | Verify | 動作確認は呼び出し経路の全段独立確認必須(中間段成功は最終段保証にならない) |
| 56 | Tools | 環境別ツール可用性: Cloud Shell は systemd 不在 -> tailscaled 起動不可 -> TIALA 到達不可。TIALA操作は Jun手元Mac or あか経由 |
| 57 | Specs | Live操作とspecs更新は対で実施(片方だけでは認識が偏る) |
| 58 | Deploy | Cloud Run Jobs deploy確認は creationTimestamp ではなく Audit Log の ReplaceJob イベントを見る |
| 59 | Cross-check | Live(gcloud/bq)とコードベース(Devin)は両方が真実の側面、両側クロスチェック必須。混乱・衝突認識時は意図的設計の可能性を先に確認 |

### 学び58 具体コマンド

```bash
gcloud logging read 'resource.type="cloud_run_job" AND protoPayload.methodName=~"google.cloud.run.v.+.Jobs.(Update|Replace|Create)Job"' \
  --project=screen-share-459802 \
  --freshness=3d --limit=20 \
  --format="value(timestamp,resource.labels.job_name,protoPayload.methodName,protoPayload.authenticationInfo.principalEmail)"
```

### 学び59 必須タイミング

1. セッション開始時の Live 再確認(Claude不在期間の変更拾い)
2. 「混乱・衝突」認識時(意図的設計の可能性、勝手に問題化しない)
3. 重要判断(Scheduler変更、Job削取、本番切替)の前

---

## 第17章 DATA PIPELINE(データパイプライン)

### BigQuery データセット

- `magi_core`(US region): メインデータセット
- `magi_analytics`(asia-northeast1): 分析用、cross-region JOIN 不可

### 主要テーブル

| テーブル | 用途 |
|---|---|
| `thoughts` | PLM 思考ログ、key columns: timestamp, llm_provider, unit_name, action, trade_mode, symbol, concerns, reasoning, session_id |
| `trades` | 取引実行記録、key columns: timestamp, llm_provider, symbol, side, price, pnl_percent, broker, thought_id |
| `trades_active` | アクティブ取引VIEW(no DELETE/INSERT) |
| `thought_embeddings` | Cohere embedding、ISABEL L5 用 |
| `optuna_params` | Optuna再最適化パラメータ |
| `isabel_l4_patterns` | ISABEL L4 パターンテーブル |
| `market_research` | MARKET_RESEARCH 構成要素の蓄積先 |
| `pre_trade_intelligence` | BRAVE 構成要素の蓄積先 |
| `llm_health_checks` | PLM ヘルスチェック |
| `vix_defense_log` | VIX 防衛ログ |
| `vix_snapshots` | VIX 観測値 |

### Schema 注意事項

- `thoughts`: `reason`(not `reasoning`)、`pnl_percent`(not `return_pct`)、`confidence` カラム無し
- `trades_active`: VIEW のため DELETE/INSERT 不可
- 全クエリで `--use_legacy_sql=false --location=US --project_id=screen-share-459802` 必須

### unit_name 厳格運用(2026-05-22 SI-2修正 PR #134以降)

- すべてのガード層(L3〜L7)から `unit_name: getUnitName(getLLMProvider())` を logGuardBlock に渡す
- `unit_name=NULL` のレコードは訓練データとして無価値、構造的に許容しない
- 旧経路(L4 paperGuards.js、L5 runL5Guard scope bug、L6/L7)はすべて PR #134 で修正済

---

## 第18章 SUCCESS CRITERIA(成功基準)

### システム全体

- 全PLM稼働、thoughts/trades の継続的蓄積
- `unit_name IS NULL` レコード = 0(SI-2 解消継続)
- 7層ガード正常動作、Constitution L79 Layer区分の整合性
- HERMES機関 各構成要素の継続稼働

### 自律取引

- PLM Job 稼働率 95%以上(平日市場時間中)
- thought-trade 紐付き率 100%(thought_id NULL trades = 0)
- broker 透過運用(MooMoo 完全移行確認済)

### パターン発見

- ISABEL L1-L5 継続稼働
- Optuna 週次再最適化稼働
- WIN/LOSE データの継続蓄積

### LILITH 蒸留

- Phase X4 production 維持
- Shadow -> Canary -> Cutover の段階的進行
- Bridge Validation eval スコア維持(regime_gate >=0.80、structural_regression <=0.05、action alignment >=0.55)
- 米国株54銘柄全カバレッジ

### Watchlist Framework

- VIX レジーム別 watchlist の PLM プロンプト統合
- VIXY fallback 動作

---

## 第19章 VERSION HISTORY

### v2.5(2026-05-29)

- ECHIDNA（エキドナ）命名: MAGI の BigQuery データ基盤全体の統一名称として導入
- 第1章 第4層「蓄積レイヤ」に ECHIDNA を明記
- 第4章 SYSTEM DOMAINS に Domain 5（ECHIDNA）を新設、旧 Domain 5 蒸留を Domain 6 へ繰り下げ
- 第17章 DATA PIPELINE を「ECHIDNA」として再定義、全データセット一覧を追加

### v2.4(2026-05-22)

- Mission Statement v2.4 草稿を第1章として組み込み(LILITH蒸留装置としての本質明文化)
- NORTH STAR を v2.4 表現に更新(米国株特化LILITH蒸留を明示)
- AUTONOMOUS TRADING UNITS を v9.23 実態反映(TIARA廃止、ORACLE廃止、LILITH PLM追加、PAUSED/学習専用表記)
- ISABEL FRAMEWORK を L1-L5 に拡張
- GUARD ARCHITECTURE 章を新規追加(L1-L7、Constitution L79 Layer 1-2-3区別)
- HERMES機関章を新規追加(5構成要素統合、ARIELの3役割明記)
- BROKER INTEGRATION 章を新規追加(MooMoo完全移行確認、ブローカー透過性原則)
- LILITH DISTILLATION ROADMAP 章を新規追加(Phase A~X4、現状X4 production)
- DEVELOPMENT ROLES を v9.23 実態反映(Devin/APM役割明確化、Gemini CLI追加)
- FORBIDDEN ACTIONS に学び 49~59 反映の禁止事項追加
- LEARNINGS REGISTRY 章を新規追加(学び 49~59 全11件、コマンド付き)
- DATA PIPELINE 章を更新(SI-2 修正PR #134反映、unit_name厳格運用明文化)
- SUCCESS CRITERIA に LILITH 蒸留基準を追加

### v2.2(2026-04-26)

- VIX-CORRELATED WATCHLIST FRAMEWORK 章を追加
- TIARA(Ollama / qwen2.5:14b @ TIALA)を AUTONOMOUS TRADING UNITS に追加(2026-04-26 時点、後の v2.4 で廃止)

### v2.1 以前

git log / Box file versions で確認可能。

---

## 文書管理

- 場所: `dogmaai/magi-stg/specifications/constitution.md`
- Boxバックアップ: `Constitution_v2.4_FULL.md`(MAGI project folder `343101199064`)
- 次回改訂: v2.6 候補事項(Watchlist VIX統合完了、LILITH Cutover完了、Phase B0 訓練完了 等の節目)
- 改訂時の必須レビュー: Jun、Claude(PM/Architect)

---

*本Constitution は MAGI System の最上位設計原則である。あらゆる実装判断は本文書の Mission Statement(第1章)に立ち返って評価される。*