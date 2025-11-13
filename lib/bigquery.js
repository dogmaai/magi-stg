'use strict';

const { BigQuery } = require('@google-cloud/bigquery');

/**
 * BigQuery オペレーション
 */
class BigQueryManager {
  constructor(datasetId = 'magi_ac', projectId = null) {
    this.bq = new BigQuery({ projectId, location: 'asia-northeast1' });
    this.datasetId = datasetId;
    this.dataset = this.bq.dataset(datasetId);
  }

  /**
   * データセット初期化
   */
  async initDataset() {
    try {
      const [exists] = await this.dataset.exists();
      if (!exists) {
        await this.bq.createDataset(this.datasetId, {
          location: 'asia-northeast1'
        });
        console.log(`✅ Dataset ${this.datasetId} created`);
      } else {
        console.log(`ℹ️ Dataset ${this.datasetId} already exists`);
      }
    } catch (error) {
      console.error('Dataset init error:', error.message);
    }
  }

  /**
   * クエリ実行
   */
  async query(sql, params = {}) {
    const options = {
      query: sql,
      params,
      location: 'asia-northeast1'
    };

    try {
      const [rows] = await this.bq.query(options);
      return rows;
    } catch (error) {
      console.error('Query error:', error.message);
      throw error;
    }
  }

  /**
   * 最新データ取得
   */
  async getLatest(symbol, table = 'financials_raw') {
    const sql = `
      SELECT * 
      FROM \`${this.bq.projectId}.${this.datasetId}.${table}\`
      WHERE symbol = @symbol
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const rows = await this.query(sql, { symbol });
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 履歴取得
   */
  async getHistory(symbol, days = 30, table = 'financials_raw') {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString();

    const sql = `
      SELECT * 
      FROM \`${this.bq.projectId}.${this.datasetId}.${table}\`
      WHERE symbol = @symbol AND timestamp >= @cutoff
      ORDER BY timestamp ASC
    `;

    return this.query(sql, { symbol, cutoff: cutoffDate });
  }

  /**
   * 統計情報
   */
  async getStats(symbol, table = 'financials_raw') {
    const sql = `
      SELECT 
        symbol,
        COUNT(*) as data_points,
        AVG(CAST(JSON_EXTRACT_SCALAR(financialData, '$.currentPrice') AS FLOAT64)) as avg_price,
        MIN(CAST(JSON_EXTRACT_SCALAR(financialData, '$.currentPrice') AS FLOAT64)) as min_price,
        MAX(CAST(JSON_EXTRACT_SCALAR(financialData, '$.currentPrice') AS FLOAT64)) as max_price
      FROM \`${this.bq.projectId}.${this.datasetId}.${table}\`
      WHERE symbol = @symbol
      GROUP BY symbol
    `;

    const rows = await this.query(sql, { symbol });
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * テーブル作成（スキーマ指定）
   */
  async createTable(tableId, schema) {
    const options = {
      schema: schema,
      location: 'asia-northeast1'
    };

    try {
      const [table] = await this.dataset.createTable(tableId, options);
      console.log(`✅ Table ${tableId} created`);
      return table;
    } catch (error) {
      if (error.message.includes('Already Exists')) {
        console.log(`ℹ️ Table ${tableId} already exists`);
        return this.dataset.table(tableId);
      }
      throw error;
    }
  }

  /**
   * External Table設定
   */
  async setupExternalTable(tableId, sourceUris, schema) {
    const externalConfig = {
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      sourceUris: sourceUris,
      schema: { fields: schema }
    };

    const options = {
      externalDataConfiguration: externalConfig
    };

    try {
      const table = this.dataset.table(tableId);
      await table.setMetadata(options);
      console.log(`✅ External table ${tableId} configured`);
    } catch (error) {
      console.error('External table setup error:', error.message);
    }
  }

  /**
   * データ挿入
   */
  async insertRows(tableId, rows) {
    const table = this.dataset.table(tableId);
    
    try {
      await table.insert(rows);
      console.log(`✅ Inserted ${rows.length} rows`);
    } catch (error) {
      console.error('Insert error:', error.message);
    }
  }
}

module.exports = BigQueryManager;
