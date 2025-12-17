/**
 * Grok (xAI) Provider
 * Unit-B2: 創造的・革新的分析
 */

import { BaseAIProvider } from './base-provider.js';
import { fetchWithRetry, handleAPIError } from './utils/error-handler.js';

export class GrokProvider extends BaseAIProvider {
  constructor(apiKey, options = {}) {
    super({
      name: 'Grok',
      model: options.model || 'grok-2-latest',
      apiKey,
      endpoint: 'https://api.x.ai/v1/chat/completions',
      timeout: options.timeout || 30000,
      maxTokens: options.maxTokens || 2048
    });
  }

  async generate(prompt, options = {}) {
    const systemPrompt = options.systemPrompt ||
      'あなたはMAGIシステムのUnit-B2（BALTHASAR-2）です。創造的・革新的な視点で投資分析を行います。';

    const response = await fetchWithRetry(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || 0.7
      })
    });

    const body = await response.json();

    if (!response.ok) {
      handleAPIError(this.name, response, body);
    }

    return body.choices?.[0]?.message?.content || '';
  }
}
