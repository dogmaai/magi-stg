/**
 * Groq Provider
 * 高速推論用
 */

import { BaseAIProvider } from './base-provider.js';
import { fetchWithRetry, handleAPIError } from './utils/error-handler.js';

export class GroqProvider extends BaseAIProvider {
  constructor(apiKey, options = {}) {
    super({
      name: 'Groq',
      model: options.model || 'llama-3.1-70b-versatile',
      apiKey,
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      timeout: options.timeout || 15000,
      maxTokens: options.maxTokens || 2048
    });
  }

  async generate(prompt, options = {}) {
    const systemPrompt = options.systemPrompt ||
      'あなたは高速な投資分析AIです。迅速かつ正確な判断を提供してください。';

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
