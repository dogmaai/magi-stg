/**
 * Gemini (Google) Provider
 * Unit-M1: 論理的・科学的分析
 */

import { BaseAIProvider } from './base-provider.js';
import { fetchWithRetry, handleAPIError } from './utils/error-handler.js';

export class GeminiProvider extends BaseAIProvider {
  constructor(apiKey, options = {}) {
    super({
      name: 'Gemini',
      model: options.model || 'gemini-2.0-flash-exp',
      apiKey,
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      timeout: options.timeout || 30000,
      maxTokens: options.maxTokens || 2048
    });
  }

  async generate(prompt, options = {}) {
    const systemPrompt = options.systemPrompt ||
      'あなたはMAGIシステムのUnit-M1（MELCHIOR-1）です。論理的・科学的な視点で投資分析を行います。';

    const url = `${this.endpoint}/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
        }],
        generationConfig: {
          maxOutputTokens: options.maxTokens || this.maxTokens,
          temperature: options.temperature || 0.7
        }
      })
    });

    const body = await response.json();

    if (!response.ok) {
      handleAPIError(this.name, response, body);
    }

    return body.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
