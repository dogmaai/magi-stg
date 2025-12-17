/**
 * OpenAI (GPT-4) Provider
 * MARY-4: 統合・裁定（Judge）
 */

import { BaseAIProvider } from './base-provider.js';
import { fetchWithRetry, handleAPIError } from './utils/error-handler.js';

export class OpenAIProvider extends BaseAIProvider {
  constructor(apiKey, options = {}) {
    super({
      name: 'OpenAI',
      model: options.model || 'gpt-4o-mini',
      apiKey,
      endpoint: 'https://api.openai.com/v1/chat/completions',
      timeout: options.timeout || 30000,
      maxTokens: options.maxTokens || 2048
    });
  }

  async generate(prompt, options = {}) {
    const systemPrompt = options.systemPrompt ||
      'あなたはMAGIシステムのMARY-4です。他のAIの分析を統合し、最終判断を下す裁定者として機能します。';

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
