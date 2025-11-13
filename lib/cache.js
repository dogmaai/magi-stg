'use strict';

/**
 * メモリ + Firestore のハイブリッドキャッシング層
 */
class CacheManager {
  constructor(firestoreManager = null) {
    this.memory = new Map();
    this.firestore = firestoreManager;
    this.ttls = new Map();
  }

  /**
   * メモリキャッシュ設定
   */
  set(key, value, ttlSeconds = 300) {
    this.memory.set(key, value);
    
    // 既存のタイマーをクリア
    if (this.ttls.has(key)) {
      clearTimeout(this.ttls.get(key));
    }
    
    // 新しいタイマーを設定
    const timer = setTimeout(() => {
      this.memory.delete(key);
      this.ttls.delete(key);
    }, ttlSeconds * 1000);
    
    this.ttls.set(key, timer);
  }

  /**
   * メモリキャッシュ取得
   */
  get(key) {
    return this.memory.get(key) || null;
  }

  /**
   * メモリキャッシュ削除
   */
  delete(key) {
    this.memory.delete(key);
    if (this.ttls.has(key)) {
      clearTimeout(this.ttls.get(key));
      this.ttls.delete(key);
    }
  }

  /**
   * 階層化取得（メモリ → Firestore）
   */
  async getMultiLevel(key, fetchFn, ttlSeconds = 300) {
    // 1. メモリキャッシュを確認
    const cached = this.get(key);
    if (cached) {
      console.log(`💚 Memory cache hit: ${key}`);
      return cached;
    }

    // 2. Firestoreキャッシュを確認
    if (this.firestore) {
      const fsCache = await this.firestore.getCache(key);
      if (fsCache) {
        console.log(`💙 Firestore cache hit: ${key}`);
        this.set(key, fsCache, ttlSeconds); // メモリに復帰
        return fsCache;
      }
    }

    // 3. 新規取得
    console.log(`🔄 Fetching fresh data: ${key}`);
    const data = await fetchFn();

    // 4. キャッシュに保存
    this.set(key, data, ttlSeconds);
    if (this.firestore) {
      await this.firestore.setCache(key, data, ttlSeconds);
    }

    return data;
  }

  /**
   * キャッシュ統計
   */
  getStats() {
    return {
      memorySize: this.memory.size,
      activeTTLs: this.ttls.size
    };
  }
}

module.exports = CacheManager;
