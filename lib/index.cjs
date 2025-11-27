'use strict';

const StorageManager = require('./storage.cjs');
const BigQueryManager = require('./bigquery.cjs');
const FirestoreManager = require('./firestore.cjs');
const CacheManager = require('./cache.cjs');

/**
 * MAGI Storage - 統一API
 */
class MAGIStorage {
  constructor(config = {}) {
    this.config = {
      bucketName: config.bucketName || 'magi-ac-data',
      datasetId: config.datasetId || 'magi_ac',
      projectId: config.projectId || null,
      ...config
    };

    // 各マネージャーを初期化
    this.storage = new StorageManager(this.config.bucketName);
    this.bigquery = new BigQueryManager(this.config.datasetId, this.config.projectId);
    this.firestore = new FirestoreManager(this.config.projectId);
    this.cache = new CacheManager(this.firestore);
  }

  /**
   * 初期化
   */
  async initialize() {
    console.log('🚀 Initializing MAGI Storage...');
    await this.bigquery.initDataset();
    console.log('✅ MAGI Storage initialized');
  }

  /**
   * 統一API: データ保存
   */
  async save(data, options = {}) {
    const {
      type = 'json', // json, jsonl, timeseries
      path,
      symbol,
      timestamp
    } = options;

    if (type === 'json') {
      return this.storage.saveJSON(data, path);
    } else if (type === 'jsonl') {
      return this.storage.appendJSONL(data, path);
    } else if (type === 'timeseries') {
      return this.firestore.saveTimeseries(symbol, data);
    } else if (type === 'delta') {
      return this.storage.saveDelta(data, symbol, timestamp);
    }
  }

  /**
   * 統一API: データ取得
   */
  async fetch(options = {}) {
    const {
      source = 'bigquery', // bigquery, storage, firestore, cache
      symbol,
      days = 30,
      path
    } = options;

    if (source === 'bigquery') {
      return this.bigquery.getLatest(symbol);
    } else if (source === 'storage') {
      return this.storage.read(path);
    } else if (source === 'firestore') {
      const month = options.month || new Date().toISOString().substring(0, 7);
      return this.firestore.getTimeseries(symbol, month);
    } else if (source === 'cache') {
      return this.cache.get(options.key);
    }
  }

  /**
   * 統一API: 履歴取得
   */
  async history(symbol, days = 30) {
    return this.bigquery.getHistory(symbol, days);
  }

  /**
   * 統一API: 統計
   */
  async stats(symbol) {
    return this.bigquery.getStats(symbol);
  }
}

module.exports = {
  MAGIStorage,
  StorageManager,
  BigQueryManager,
  FirestoreManager,
  CacheManager
};
