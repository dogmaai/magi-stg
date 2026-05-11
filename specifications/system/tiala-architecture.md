# TIALA 構成図

最終更新: 2026-05-11

> **TIALA = ハードウェア名（末尾 LA）/ TIARA = PLM ユニット名（末尾 RA）**。L/R 1 文字違いのため混同厳禁。

## 概要

TIALA は **Jun 自宅に設置された Mac mini M4 16GB Unified** で、Tailscale IP `100.114.185.1` を持つ。
このホスト上で **4 つのサービス + 1 つのカスタム Ollama モデル群** が常駐し、`Tailscale Funnel`（`https://aka.aegean-boa.ts.net`）と `ngrok` で外部の GCP / Telegram / MooMoo に接続する。

---

## 1. TIALA 内部構成（マシン内）

```mermaid
flowchart TB
    subgraph TIALA["🖥️ TIALA  -  Mac mini M4 16GB Unified  -  Tailscale 100.114.185.1"]
        direction TB

        subgraph OllamaSrv["🧠 Ollama サーバー  (port 11434)"]
            ArielM["model: <b>ariel</b><br/>qwen2.5:7b ベース<br/>(ARIEL 用)"]
            TiaraM["model: <b>qwen2.5:14b</b><br/>(TIARA PLM 用)"]
        end

        ArielSvc["🤖 <b>ARIEL Service</b>  (port 18789)<br/>OpenClaw framework<br/>Telegram Intent Parser<br/>(取引判断はしない)"]

        OpenClawProxy["🔀 OpenClaw proxy  (port 11435)"]

        MoomooBridge["💹 moomoo-bridge.py  (port 11436)<br/>MooMoo OpenAPI 連携<br/>(Phase 2)"]

        ArielSvc -- 推論呼び出し --> OllamaSrv
        OpenClawProxy -.-> OllamaSrv
    end

    classDef hw fill:#1f2937,stroke:#60a5fa,color:#e5e7eb,stroke-width:2px
    classDef srv fill:#0b3d2e,stroke:#34d399,color:#e5e7eb
    classDef model fill:#3b1d51,stroke:#a78bfa,color:#e5e7eb
    class TIALA hw
    class ArielSvc,OpenClawProxy,MoomooBridge,OllamaSrv srv
    class ArielM,TiaraM model
```

### サービス一覧

| ポート | サービス | 役割 | 備考 |
|---|---|---|---|
| **11434** | Ollama HTTP API | ローカル LLM 推論サーバー | `ariel` / `qwen2.5:14b` の 2 モデル提供 |
| **11435** | OpenClaw proxy | OpenClaw フレームワークのプロキシ層 | 内部接続用 |
| **11436** | moomoo-bridge.py | MooMoo OpenAPI へのブリッジ | Phase 2 取引用 |
| **18789** | ARIEL Service | Telegram Intent Parser（OpenClaw） | 取引判断は行わない |

### Ollama 上のモデル

| モデル名（Ollama） | ベース | 用途 |
|---|---|---|
| `ariel` | qwen2.5:7b ベースのカスタム Modelfile | ARIEL 用（Intent Parser のツール呼び出し） |
| `qwen2.5:14b` | 公式 qwen2.5:14b | TIARA PLM（自律取引ユニット） |

---

## 2. TIALA と外部の接続関係

```mermaid
flowchart LR
    TG["📱 Telegram<br/>(ユーザー)"]

    subgraph TIALA["🖥️ TIALA  (Mac mini M4 @ Jun自宅)"]
        ArielSvc["ARIEL Service<br/>port 18789"]
        OllamaSrv["Ollama<br/>port 11434<br/>(ariel / qwen2.5:14b)"]
        MoomooBridge["moomoo-bridge.py<br/>port 11436"]
    end

    Funnel["🌐 Tailscale Funnel<br/><b>https://aka.aegean-boa.ts.net</b>"]
    Ngrok["🌐 ngrok tunnel<br/>(動的URL、BQ service_endpoints で配信)"]

    subgraph GCP["☁️ GCP (asia-northeast1 / screen-share-459802)"]
        IntentParser["magi-core / intent-parser.js<br/><i>callArielWithTools()</i>"]
        OllamaJob["Cloud Run Job<br/><b>magi-core-ollama</b><br/>(LLM_PROVIDER=ollama,<br/>UNIT_NAME=TIARA)"]
        MoomooProxy["Cloud Run<br/><b>magi-moomoo</b> proxy"]
        BQ[("BigQuery<br/>magi_core")]
    end

    Anthropic["🤖 Anthropic API<br/>claude-3-5-haiku-20241022<br/>(= <b>AKA-1</b> fallback)"]
    MoomooAPI["🔌 MooMoo OpenAPI"]

    %% Telegram → ARIEL
    TG -- "ボット経由でクエリ" --> ArielSvc
    ArielSvc -- "Ollama 推論 (ariel model)" --> OllamaSrv
    ArielSvc -- "ARIEL Tools: query_trades" --> BQ
    ArielSvc -- "ARIEL 失敗時フォールバック<br/>(PR #90 で Gemini→Haiku に統一)" --> Anthropic

    %% magi-core → TIALA
    IntentParser -- "POST /v1/chat/completions" --> Funnel
    Funnel --> OllamaSrv

    %% TIARA PLM ジョブ
    OllamaJob -- "Ollama 推論<br/>(qwen2.5:14b)" --> Funnel

    %% MooMoo 経路
    MoomooProxy -- "サービスディスカバリ<br/>(BQ service_endpoints)" --> Ngrok
    Ngrok --> MoomooBridge
    MoomooBridge --> MoomooAPI

    classDef hw fill:#1f2937,stroke:#60a5fa,color:#e5e7eb,stroke-width:2px
    classDef cloud fill:#1e3a8a,stroke:#93c5fd,color:#e5e7eb
    classDef ext fill:#4c1d95,stroke:#c4b5fd,color:#e5e7eb
    classDef tunnel fill:#7c2d12,stroke:#fb923c,color:#fff
    class TIALA hw
    class GCP cloud
    class TG,Anthropic,MoomooAPI ext
    class Funnel,Ngrok tunnel
```

### 外部接続まとめ

| 接続経路 | 用途 | エンドポイント |
|---|---|---|
| Tailscale Funnel | TIALA Ollama を GCP / 外部から HTTPS で叩く | `https://aka.aegean-boa.ts.net` |
| ngrok | MooMoo bridge を GCP から到達可能にする | 動的 URL、BQ `service_endpoints` テーブルで配信 |
| Telegram Bot | ARIEL への問い合わせ | `@magi_claw_bot` 系 |

---

## 3. データフロー別の整理

### A. Telegram → ARIEL → BigQuery（Intent Parser）

```mermaid
sequenceDiagram
    autonumber
    actor Jun as Jun (Telegram)
    participant Bot as Telegram Bot
    participant ARIEL as ARIEL :18789<br/>(OpenClaw)
    participant Ollama as Ollama :11434<br/>(model: ariel)
    participant Tools as ARIEL Tools
    participant BQ as BigQuery
    participant Haiku as Anthropic Haiku<br/>(AKA-1)

    Jun ->> Bot: 自然言語クエリ
    Bot ->> ARIEL: query
    ARIEL ->> Ollama: chat.completions (tools)
    Ollama -->> ARIEL: tool_calls
    ARIEL ->> Tools: query_trades / get_vix / ...
    Tools ->> BQ: SELECT
    BQ -->> Tools: rows
    Tools -->> ARIEL: tool result
    ARIEL ->> Ollama: 続行
    Ollama -->> ARIEL: 最終応答
    ARIEL -->> Bot: 応答

    Note over ARIEL,Haiku: Ollama がエラー時のみ<br/>1 回だけ Haiku にフォールバック
    ARIEL -->> Haiku: prompt (fallback)
    Haiku -->> ARIEL: response
```

### B. magi-core PLM ジョブ (TIARA) → Tailscale Funnel → Ollama

```mermaid
sequenceDiagram
    autonumber
    participant Sched as Cloud Scheduler<br/>(20:30 UTC, 月-金)
    participant Job as Cloud Run Job<br/>magi-core-ollama
    participant Funnel as Tailscale Funnel
    participant Ollama as TIALA Ollama :11434<br/>(model: qwen2.5:14b)
    participant Alpaca as Alpaca Paper Trading
    participant BQ as BigQuery magi_core

    Sched ->> Job: 起動 (UNIT_NAME=TIARA)
    Job ->> Funnel: POST /v1/chat/completions
    Funnel ->> Ollama: forward
    Ollama -->> Funnel: PLM 思考
    Funnel -->> Job: 応答
    Job ->> Job: 7層ガード判定
    Job ->> Alpaca: 取引執行
    Job ->> BQ: thoughts / trades_active 書き込み
```

### C. MooMoo 取引（Phase 2）

```mermaid
sequenceDiagram
    autonumber
    participant Cloud as Cloud Run (GCP)
    participant MProxy as magi-moomoo proxy
    participant BQ as BigQuery<br/>service_endpoints
    participant Ngrok as ngrok tunnel
    participant Bridge as moomoo-bridge.py :11436
    participant API as MooMoo OpenAPI

    Cloud ->> MProxy: /trade/*
    MProxy ->> BQ: 現在の ngrok URL を解決
    BQ -->> MProxy: opend-proxy URL
    MProxy ->> Ngrok: HTTPS
    Ngrok ->> Bridge: forward
    Bridge ->> API: 注文
    API -->> Bridge: 約定
    Bridge -->> MProxy: 結果
```

---

## 4. 関連ファイル / 参照

| ファイル | 説明 |
|---|---|
| `magi-stg/specifications/system/overview.md` | システム全体構成 |
| `magi-stg/specifications/agents/llm-units.md` | TIALA 上の TIARA / Ollama 詳細 |
| `magi-stg/specifications/constitution.md` | TIARA ペルソナ定義 |
| `magi-stg/MEMORY.md` | エージェント一覧 + Telegram 連携 |
| `magi-core/intent-parser.js` | ARIEL Intent Parser、`OLLAMA_BASE_URL = https://aka.aegean-boa.ts.net` |
| `magi-core/ariel-tools.js` | ARIEL の 6 ツール定義 |
| `magi-core/scripts/run-tiara.sh` | TIARA PLM 起動スクリプト |
| `magi-core/lib/secrets.js` | `OLLAMA_BASE_URL` デフォルト値 |
| `magi-moomoo/server.js` | MooMoo proxy、ngrok 経由で bridge に到達 |

---

## 5. 命名規則のリマインダー

| 名前 | 種類 | 末尾 | 内容 |
|---|---|---|---|
| **TIALA** | ハードウェア | **LA** | Mac mini M4 16GB Unified（Jun 自宅） |
| **TIARA** | PLM ユニット | **RA** | Ollama 上の qwen2.5:14b、自律取引 PLM |
| **ARIEL** | エージェント | — | Telegram Intent Parser（取引判断しない） |
| **AKA-1（あか）** | エージェント | — | Claude Haiku、Telegram 高速応答 + ARIEL fallback |
