---

## 仕様書アーカイブAPI（v7.2追加）

### 概要
仕様書のバージョン管理とCloud Storageへの自動アーカイブ機能。

### エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| POST | /api/specs/archive | 現在の仕様書をアーカイブ |
| POST | /api/specs/sync | 最新仕様書をcurrent/に同期 |
| GET | /api/specs/archives | アーカイブ一覧取得 |

### POST /api/specs/archive

現在の仕様書をCloud Storageにアーカイブ保存。

**リクエスト:**
```json
{"version": "4.0"}
```

**レスポンス:**
```json
{
  "success": true,
  "archivePath": "archive/2026-01/specs-v4.0-2026-01-05T05-03-06-310Z",
  "files": [...]
}
```

### Cloud Storage構成

| バケット | 用途 |
|---------|------|
| gs://magi-specs/current/ | 最新仕様書 |
| gs://magi-specs/archive/ | 過去バージョン |

### ライフサイクルルール

| 経過日数 | ストレージクラス | コスト/GB/月 |
|---------|-----------------|-------------|
| 0-30日 | Standard | $0.02 |
| 30-365日 | Nearline | $0.01 |
| 365日以上 | Archive | $0.0012 |