'use strict';

const { Storage } = require('@google-cloud/storage');

/**
 * Cloud Storage オペレーション
 */
class StorageManager {
  constructor(bucketName = 'magi-ac-data') {
    this.client = new Storage();
    this.bucket = this.client.bucket(bucketName);
    this.bucketName = bucketName;
  }

  /**
   * JSONファイル保存
   */
  async saveJSON(data, path) {
    const file = this.bucket.file(path);
    await file.save(JSON.stringify(data, null, 2), {
      contentType: 'application/json'
    });
    return `gs://${this.bucketName}/${path}`;
  }

  /**
   * JSONL形式（行区切り）保存
   */
  async appendJSONL(data, path) {
    const file = this.bucket.file(path);
    const line = JSON.stringify(data) + '\n';
    
    try {
      // 既存ファイルに追記
      const [exists] = await file.exists();
      if (exists) {
        const [content] = await file.download();
        const newContent = content.toString() + line;
        await file.save(newContent, { contentType: 'text/plain' });
      } else {
        await file.save(line, { contentType: 'text/plain' });
      }
    } catch (e) {
      console.error('JSONL append error:', e.message);
      throw e;
    }
  }

  /**
   * ファイル読み込み
   */
  async read(path) {
    const file = this.bucket.file(path);
    const [exists] = await file.exists();
    
    if (!exists) return null;
    
    const [content] = await file.download();
    try {
      return JSON.parse(content.toString());
    } catch (e) {
      return content.toString();
    }
  }

  /**
   * ファイルリスト取得
   */
  async list(prefix) {
    const [files] = await this.bucket.getFiles({ prefix });
    return files.map(f => ({
      name: f.name,
      size: f.metadata.size,
      updated: f.metadata.updated
    }));
  }

  /**
   * ファイル削除
   */
  async delete(path) {
    await this.bucket.file(path).delete();
  }

  /**
   * 差分保存（Delta）
   */
  async saveDelta(data, symbol, timestamp) {
    const date = timestamp.split('T')[0];
    const path = `deltas/${symbol}/${date}/${timestamp.replace(/[:.]/g, '-')}.json`;
    return this.saveJSON(data, path);
  }

  /**
   * 月別ファイル名生成
   */
  getMonthlyPath(symbol, date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `timeseries/${symbol}/${year}-${month}.jsonl`;
  }

  /**
   * アーカイブ
   */
  async archive(sourcePrefix, destPath) {
    const [files] = await this.bucket.getFiles({ prefix: sourcePrefix });
    console.log(`Archiving ${files.length} files to ${destPath}`);
    
    for (const file of files) {
      const [content] = await file.download();
      const archiveFile = this.bucket.file(destPath + file.name);
      await archiveFile.save(content);
    }
  }
}

module.exports = StorageManager;
