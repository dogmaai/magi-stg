/**
 * MAGI Live Status API
 * 各サービスのヘルスチェックを実行し、バージョン整合性を確認
 * GET /public/live-status
 */

import express from 'express';

const router = express.Router();

// サービス一覧（内部通信用URL）
const SERVICES = [
  { name: 'magi-ui', url: 'https://magi-ui-398890937507.asia-northeast1.run.app', specVersion: '1.1' },
  { name: 'magi-app', url: 'https://magi-app-398890937507.asia-northeast1.run.app', specVersion: '1.0' },
  { name: 'magi-ac', url: 'https://magi-ac-398890937507.asia-northeast1.run.app', specVersion: '7.0' },
  { name: 'magi-mcp', url: 'https://magi-mcp-398890937507.asia-northeast1.run.app', specVersion: '1.0' },
  { name: 'magi-moni', url: 'https://magi-moni-398890937507.asia-northeast1.run.app', specVersion: '1.0' },
  { name: 'magi-data-collector', url: 'https://magi-data-collector-398890937507.asia-northeast1.run.app', specVersion: '1.1.0' },
  { name: 'magi-decision', url: 'https://magi-decision-398890937507.asia-northeast1.run.app', specVersion: '5.0.0' },
  { name: 'magi-executor', url: 'https://magi-executor-398890937507.asia-northeast1.run.app', specVersion: '5.1.0' },
  { name: 'magi-websocket', url: 'https://magi-websocket-398890937507.asia-northeast1.run.app', specVersion: '1.3' }
];

// Identity Token取得（サービス間認証用）
async function getIdentityToken(targetUrl) {
  try {
    const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${targetUrl}`;
    const response = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' }
    });
    if (response.ok) {
      return await response.text();
    }
  } catch (e) {
    // ローカル環境では失敗する
  }
  return null;
}

// 単一サービスのヘルスチェック
async function checkService(service) {
  const startTime = Date.now();
  try {
    const token = await getIdentityToken(service.url);
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト
    
    const response = await fetch(`${service.url}/health`, {
      headers,
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        name: service.name,
        status: 'healthy',
        actualVersion: data.version || 'unknown',
        specVersion: service.specVersion,
        versionMatch: (data.version || 'unknown') === service.specVersion,
        latency_ms: latency,
        url: service.url
      };
    } else {
      return {
        name: service.name,
        status: 'unhealthy',
        actualVersion: 'N/A',
        specVersion: service.specVersion,
        versionMatch: false,
        latency_ms: latency,
        httpStatus: response.status,
        url: service.url
      };
    }
  } catch (error) {
    return {
      name: service.name,
      status: 'error',
      actualVersion: 'N/A',
      specVersion: service.specVersion,
      versionMatch: false,
      error: error.name === 'AbortError' ? 'timeout' : error.message,
      url: service.url
    };
  }
}

// GET /public/live-status
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  // 全サービスを並列チェック
  const results = await Promise.all(SERVICES.map(checkService));
  
  // 統計計算
  const healthy = results.filter(r => r.status === 'healthy').length;
  const unhealthy = results.filter(r => r.status === 'unhealthy').length;
  const errors = results.filter(r => r.status === 'error').length;
  const versionGaps = results.filter(r => !r.versionMatch && r.status === 'healthy');
  
  const response = {
    success: true,
    timestamp: new Date().toISOString(),
    spec_version: '7.2',
    total_services: SERVICES.length,
    summary: {
      healthy,
      unhealthy,
      errors,
      version_mismatches: versionGaps.length
    },
    services: results,
    gaps_detected: versionGaps.map(g => 
      `${g.name}: spec says ${g.specVersion}, actual ${g.actualVersion}`
    ),
    total_latency_ms: Date.now() - startTime
  };
  
  res.json(response);
});

export default router;
