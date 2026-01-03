import express from 'express';
import { roleManager } from '../services/role-manager.js';

const router = express.Router();

// GET /public/role-assignments - 認証不要（サービス向け）
router.get('/public/role-assignments', (req, res) => {
  try {
    const roles = roleManager.getRoles();
    res.json(roles);
  } catch (error) {
    console.error('[Roles] Error getting roles:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /public/role-assignments/:service - 特定サービスのロールのみ
router.get('/public/role-assignments/:service', (req, res) => {
  try {
    const roles = roleManager.getServiceRoles(req.params.service);
    if (!roles) {
      return res.status(404).json({ error: `Service not found: ${req.params.service}` });
    }
    res.json(roles);
  } catch (error) {
    console.error('[Roles] Error getting service roles:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /admin/role-assignments - 管理用（認証必要）
router.get('/admin/role-assignments', (req, res) => {
  try {
    const roles = roleManager.getRoles();
    const providers = roleManager.getAvailableProviders();
    res.json({
      ...roles,
      available_providers: providers
    });
  } catch (error) {
    console.error('[Roles] Error getting admin roles:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /admin/role-assignments - ロール更新（認証必要）
router.put('/admin/role-assignments', async (req, res) => {
  try {
    const updatedBy = req.headers['x-updated-by'] || 'admin';
    const updatedRoles = await roleManager.updateRoles(req.body, updatedBy);
    res.json({
      success: true,
      message: 'Roles updated successfully',
      roles: updatedRoles
    });
  } catch (error) {
    console.error('[Roles] Error updating roles:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT /admin/role-assignments/:service/:role - 個別ロール更新
router.put('/admin/role-assignments/:service/:role', async (req, res) => {
  try {
    const { service, role } = req.params;
    const updatedBy = req.headers['x-updated-by'] || 'admin';
    const updatedRole = await roleManager.updateServiceRole(service, role, req.body, updatedBy);
    res.json({
      success: true,
      message: `Role ${role} in ${service} updated successfully`,
      role: updatedRole
    });
  } catch (error) {
    console.error('[Roles] Error updating service role:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /admin/role-assignments/reset - デフォルトにリセット（認証必要）
router.post('/admin/role-assignments/reset', async (req, res) => {
  try {
    const roles = await roleManager.resetToDefault();
    res.json({
      success: true,
      message: 'Roles reset to default',
      roles
    });
  } catch (error) {
    console.error('[Roles] Error resetting roles:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
