import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDITS_PATH = path.join(__dirname, '../../config/api-credits.json');

class CreditManager {
  constructor() {
    this.credits = null;
  }

  async initialize() {
    await this.loadCredits();
  }

  async loadCredits() {
    try {
      const data = await fs.readFile(CREDITS_PATH, 'utf-8');
      this.credits = JSON.parse(data);
      console.log('[CreditManager] Loaded API credits configuration');
      return this.credits;
    } catch (error) {
      console.error('[CreditManager] Failed to load credits:', error);
      // デフォルト構造を作成
      this.credits = { version: '1.0', providers: {} };
      return this.credits;
    }
  }

  getCredits() {
    return this.credits;
  }

  getProviderCredit(providerId) {
    return this.credits?.providers?.[providerId] || null;
  }

  calculateStatus(provider) {
    // Free tierは常にOK
    if (provider.tier === 'free') {
      return 'ok';
    }

    // 残高が不明な場合
    if (provider.balance === null) {
      return 'unknown';
    }

    // 期限切れチェック
    if (provider.expiration) {
      const expDate = new Date(provider.expiration);
      if (expDate < new Date()) {
        return 'expired';
      }
      // 7日以内に期限切れ
      const daysUntilExpiry = (expDate - new Date()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry <= 7) {
        return 'expiring_soon';
      }
    }

    // 残高チェック
    if (provider.threshold_critical && provider.balance <= provider.threshold_critical) {
      return 'critical';
    }
    if (provider.threshold_warning && provider.balance <= provider.threshold_warning) {
      return 'warning';
    }

    return 'ok';
  }

  async updateProviderCredit(providerId, updates, updatedBy = 'system') {
    if (!this.credits.providers[providerId]) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // 更新
    this.credits.providers[providerId] = {
      ...this.credits.providers[providerId],
      ...updates,
      last_checked: new Date().toISOString()
    };

    // ステータス再計算
    this.credits.providers[providerId].status =
      this.calculateStatus(this.credits.providers[providerId]);

    this.credits.updated_at = new Date().toISOString();
    this.credits.updated_by = updatedBy;

    // 保存
    await fs.writeFile(CREDITS_PATH, JSON.stringify(this.credits, null, 2), 'utf-8');

    console.log(`[CreditManager] Updated ${providerId} by ${updatedBy}`);
    return this.credits.providers[providerId];
  }

  async updateAllStatuses() {
    for (const [providerId, provider] of Object.entries(this.credits.providers)) {
      this.credits.providers[providerId].status = this.calculateStatus(provider);
    }
    this.credits.updated_at = new Date().toISOString();
    await fs.writeFile(CREDITS_PATH, JSON.stringify(this.credits, null, 2), 'utf-8');
    return this.credits;
  }

  // Anthropic API残高取得（自動取得対応プロバイダー）
  async fetchAnthropicBalance() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.log('[CreditManager] ANTHROPIC_API_KEY not set');
      return null;
    }

    try {
      // Anthropicは現在残高APIを公開していないため、
      // 手動入力にフォールバック
      console.log('[CreditManager] Anthropic balance API not available, use manual entry');
      return null;
    } catch (error) {
      console.error('[CreditManager] Anthropic fetch error:', error.message);
      return null;
    }
  }

  // OpenAI API残高取得
  async fetchOpenAIBalance() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log('[CreditManager] OPENAI_API_KEY not set');
      return null;
    }

    try {
      // OpenAIの残高APIエンドポイント
      // 注意: このAPIは廃止/変更される可能性あり
      const response = await fetch('https://api.openai.com/dashboard/billing/credit_grants', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log('[CreditManager] OpenAI balance API returned:', response.status);
        return null;
      }

      const data = await response.json();
      return {
        balance: data.total_available || null,
        currency: 'USD'
      };
    } catch (error) {
      console.error('[CreditManager] OpenAI fetch error:', error.message);
      return null;
    }
  }

  // 全プロバイダーの自動取得を試行
  async refreshAutoFetchProviders() {
    const results = {};

    // Anthropic
    if (this.credits.providers.anthropic?.auto_fetch) {
      const balance = await this.fetchAnthropicBalance();
      if (balance) {
        await this.updateProviderCredit('anthropic', balance, 'auto-fetch');
        results.anthropic = 'success';
      } else {
        results.anthropic = 'skipped';
      }
    }

    // OpenAI
    if (this.credits.providers.openai?.auto_fetch) {
      const balance = await this.fetchOpenAIBalance();
      if (balance) {
        await this.updateProviderCredit('openai', balance, 'auto-fetch');
        results.openai = 'success';
      } else {
        results.openai = 'skipped';
      }
    }

    return results;
  }

  getSummary() {
    const summary = {
      total_providers: 0,
      ok: 0,
      warning: 0,
      critical: 0,
      unknown: 0,
      expired: 0
    };

    for (const provider of Object.values(this.credits.providers || {})) {
      summary.total_providers++;
      switch (provider.status) {
        case 'ok':
          summary.ok++;
          break;
        case 'warning':
        case 'expiring_soon':
          summary.warning++;
          break;
        case 'critical':
          summary.critical++;
          break;
        case 'expired':
          summary.expired++;
          break;
        default:
          summary.unknown++;
      }
    }

    return summary;
  }
}

// シングルトン
export const creditManager = new CreditManager();
