import express from 'express';
import { creditManager } from '../services/credit-manager.js';

const router = express.Router();

// GET /admin/api-status - 全プロバイダーのクレジット状況
router.get('/admin/api-status', (req, res) => {
  try {
    const credits = creditManager.getCredits();
    const summary = creditManager.getSummary();
    res.json({
      ...credits,
      summary
    });
  } catch (error) {
    console.error('[Credits] Error getting status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /admin/api-status/:provider - 特定プロバイダーのクレジット
router.get('/admin/api-status/:provider', (req, res) => {
  try {
    const credit = creditManager.getProviderCredit(req.params.provider);
    if (!credit) {
      return res.status(404).json({ error: `Provider not found: ${req.params.provider}` });
    }
    res.json(credit);
  } catch (error) {
    console.error('[Credits] Error getting provider status:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /admin/api-status/:provider - プロバイダーのクレジット更新（手動入力）
router.put('/admin/api-status/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const updatedBy = req.headers['x-updated-by'] || 'admin';

    // 許可されるフィールドのみ更新
    const allowedFields = ['balance', 'expiration', 'notes', 'tier'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updatedCredit = await creditManager.updateProviderCredit(provider, updates, updatedBy);
    res.json({
      success: true,
      message: `${provider} credit updated`,
      credit: updatedCredit
    });
  } catch (error) {
    console.error('[Credits] Error updating provider:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /admin/api-status/refresh - 自動取得プロバイダーの更新
router.post('/admin/api-status/refresh', async (req, res) => {
  try {
    const results = await creditManager.refreshAutoFetchProviders();
    const credits = creditManager.getCredits();
    const summary = creditManager.getSummary();

    res.json({
      success: true,
      message: 'Auto-fetch completed',
      fetch_results: results,
      credits,
      summary
    });
  } catch (error) {
    console.error('[Credits] Error refreshing:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/api-status/recalculate - 全ステータス再計算
router.post('/admin/api-status/recalculate', async (req, res) => {
  try {
    const credits = await creditManager.updateAllStatuses();
    const summary = creditManager.getSummary();

    res.json({
      success: true,
      message: 'Statuses recalculated',
      credits,
      summary
    });
  } catch (error) {
    console.error('[Credits] Error recalculating:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /public/api-summary - 公開サマリー（詳細なし）
router.get('/public/api-summary', (req, res) => {
  try {
    const summary = creditManager.getSummary();
    res.json({
      status: summary.critical > 0 ? 'critical' :
              summary.warning > 0 ? 'warning' : 'ok',
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
