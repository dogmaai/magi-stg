import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROLES_PATH = path.join(__dirname, '../../config/default-roles.json');
const CUSTOM_ROLES_PATH = path.join(__dirname, '../../config/custom-roles.json');

class RoleManager {
  constructor() {
    this.roles = null;
    this.lastUpdated = null;
  }

  async initialize() {
    await this.loadRoles();
  }

  async loadRoles() {
    try {
      // カスタム設定があればそちらを優先
      try {
        const customData = await fs.readFile(CUSTOM_ROLES_PATH, 'utf-8');
        this.roles = JSON.parse(customData);
        console.log('[RoleManager] Loaded custom roles configuration');
      } catch (e) {
        // カスタム設定がなければデフォルトを使用
        const defaultData = await fs.readFile(DEFAULT_ROLES_PATH, 'utf-8');
        this.roles = JSON.parse(defaultData);
        console.log('[RoleManager] Loaded default roles configuration');
      }
      this.lastUpdated = new Date().toISOString();
      return this.roles;
    } catch (error) {
      console.error('[RoleManager] Failed to load roles:', error);
      throw error;
    }
  }

  getRoles() {
    return {
      ...this.roles,
      updated_at: this.lastUpdated
    };
  }

  getServiceRoles(serviceName) {
    if (!this.roles?.services?.[serviceName]) {
      return null;
    }
    return {
      service: serviceName,
      ...this.roles.services[serviceName],
      updated_at: this.lastUpdated
    };
  }

  getAvailableProviders() {
    return this.roles?.available_providers || [];
  }

  async updateRoles(newRoles, updatedBy = 'system') {
    // バリデーション
    this.validateRoles(newRoles);

    // 更新情報を追加
    const updatedRoles = {
      ...this.roles,
      services: {
        ...this.roles.services,
        ...newRoles.services
      },
      updated_at: new Date().toISOString(),
      updated_by: updatedBy
    };

    // カスタム設定として保存
    await fs.writeFile(
      CUSTOM_ROLES_PATH,
      JSON.stringify(updatedRoles, null, 2),
      'utf-8'
    );

    this.roles = updatedRoles;
    this.lastUpdated = updatedRoles.updated_at;

    console.log(`[RoleManager] Roles updated by ${updatedBy}`);
    return this.roles;
  }

  async updateServiceRole(serviceName, roleName, roleConfig, updatedBy = 'system') {
    if (!this.roles?.services?.[serviceName]) {
      throw new Error(`Service not found: ${serviceName}`);
    }
    if (!this.roles.services[serviceName].roles[roleName]) {
      throw new Error(`Role not found: ${roleName} in ${serviceName}`);
    }

    // プロバイダーとモデルのバリデーション
    this.validateProviderModel(roleConfig.provider, roleConfig.model);

    // 更新
    this.roles.services[serviceName].roles[roleName] = {
      ...this.roles.services[serviceName].roles[roleName],
      ...roleConfig
    };

    this.roles.updated_at = new Date().toISOString();
    this.roles.updated_by = updatedBy;

    // 保存
    await fs.writeFile(
      CUSTOM_ROLES_PATH,
      JSON.stringify(this.roles, null, 2),
      'utf-8'
    );

    this.lastUpdated = this.roles.updated_at;
    console.log(`[RoleManager] Role ${roleName} in ${serviceName} updated by ${updatedBy}`);

    return this.roles.services[serviceName].roles[roleName];
  }

  async resetToDefault() {
    try {
      // カスタム設定ファイルを削除
      await fs.unlink(CUSTOM_ROLES_PATH);
      console.log('[RoleManager] Custom roles deleted');
    } catch (e) {
      // ファイルがなくてもOK
    }

    // デフォルトを再読み込み
    await this.loadRoles();
    return this.roles;
  }

  validateRoles(roles) {
    if (!roles || typeof roles !== 'object') {
      throw new Error('Invalid roles format');
    }
    if (roles.services) {
      for (const [serviceName, service] of Object.entries(roles.services)) {
        if (!service.roles || typeof service.roles !== 'object') {
          throw new Error(`Invalid roles format for service: ${serviceName}`);
        }
        for (const [roleName, role] of Object.entries(service.roles)) {
          if (!role.provider || !role.model) {
            throw new Error(`Missing provider or model for role: ${roleName}`);
          }
          this.validateProviderModel(role.provider, role.model);
        }
      }
    }
  }

  validateProviderModel(provider, model) {
    const providerConfig = this.roles?.available_providers?.find(p => p.id === provider);
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    if (!providerConfig.models.includes(model)) {
      throw new Error(`Unknown model ${model} for provider ${provider}. Available: ${providerConfig.models.join(', ')}`);
    }
  }
}

// シングルトン
export const roleManager = new RoleManager();
