/**
 * Claude (Anthropic) Provider
 * Unit-C3: 人間的・倫理的分析
 */

import { BaseAIProvider } from './base-provider.js';
import { fetchWithRetry, handleAPIError } from './utils/error-handler.js';

export class ClaudeProvider extends BaseAIProvider {
  constructor(apiKey, options = {}) {
    super({
      name: 'Claude',
      model: options.model || 'claude-sonnet-4-20250514',
      apiKey,
      endpoint: 'https://api.anthropic.com/v1/messages',
      timeout: options.timeout || 30000,
      maxTokens: options.maxTokens || 2048
    });
  }

  async generate(prompt, options = {}) {
    const systemPrompt = options.systemPrompt ||
      'あなたはMAGIシステムのUnit-C3（CASPER-3）です。人間的・倫理的な視点で投資分析を行います。ESGや長期的な社会的影響も考慮してください。';

    const response = await fetchWithRetry(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens || this.maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    const body = await response.json();

    if (!response.ok) {
      handleAPIError(this.name, response, body);
    }

    return body.content?.[0]?.text || '';
  }
}
