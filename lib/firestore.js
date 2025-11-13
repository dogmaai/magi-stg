'use strict';

const { Firestore } = require('@google-cloud/firestore');

class FirestoreManager {
  constructor(projectId = null) {
    this.db = new Firestore({ projectId, preferRest: false });
  }

  async saveDoc(collection, docId, data) {
    try {
      await this.db.collection(collection).doc(docId).set(data, { merge: true });
      return docId;
    } catch (error) {
      console.error('Save doc error:', error.message);
      throw error;
    }
  }

  async getDoc(collection, docId) {
    try {
      const doc = await this.db.collection(collection).doc(docId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Get doc error:', error.message);
      return null;
    }
  }

  async saveTimeseries(symbol, data, month = null) {
    const now = new Date();
    const year = now.getFullYear();
    const monthStr = month || String(now.getMonth() + 1).padStart(2, '0');
    
    const monthKey = `${year}-${monthStr}`;
    const docId = `${symbol}/${monthKey}`;

    const doc = {
      symbol,
      month: monthKey,
      timestamp: data.timestamp,
      data: data,
      updatedAt: new Date()
    };

    return this.saveDoc('timeseries', docId, doc);
  }

  async getTimeseries(symbol, month) {
    const docId = `${symbol}/${month}`;
    return this.getDoc('timeseries', docId);
  }

  async setCache(key, value, ttlSeconds = 300) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    return this.saveDoc('cache', key, {
      value,
      expiresAt,
      createdAt: new Date()
    });
  }

  async getCache(key) {
    const doc = await this.getDoc('cache', key);
    
    if (!doc) return null;
    
    if (doc.expiresAt && doc.expiresAt.toDate() < new Date()) {
      await this.deleteDoc('cache', key);
      return null;
    }
    
    return doc.value;
  }

  async deleteDoc(collection, docId) {
    try {
      await this.db.collection(collection).doc(docId).delete();
    } catch (error) {
      console.error('Delete doc error:', error.message);
    }
  }

  async queryCollection(collection, conditions = []) {
    try {
      let query = this.db.collection(collection);
      
      for (const [field, operator, value] of conditions) {
        query = query.where(field, operator, value);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Query collection error:', error.message);
      return [];
    }
  }
}

module.exports = FirestoreManager;
