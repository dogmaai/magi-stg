/**
 * Cohere Provider
 * ISABEL: 文書分析・RAG
 */

import { BaseAIProvider } from './base-provider.js';
import { fetchWithRetry, handleAPIError } from './utils/error-handler.js';

export class CohereProvider extends BaseAIProvider {
  constructor(apiKey, options = {}) {
    super({
      name: 'Cohere',
      model: options.model || 'command-r-plus',
      apiKey,
      endpoint: 'https://api.cohere.ai/v1/chat',
      timeout: options.timeout || 30000,
      maxTokens: options.maxTokens || 2048
    });
  }

  async generate(prompt, options = {}) {
    const response = await fetchWithRetry(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        message: prompt,
        preamble: options.systemPrompt || 'あなたはMAGIシステムのISABELです。文書分析とRAG検索を担当します。',
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || 0.3
      })
    });

    const body = await response.json();

    if (!response.ok) {
      handleAPIError(this.name, response, body);
    }

    return body.text || '';
  }

  /**
   * Rerank API
   */
  async rerank(query, documents, topN = 5) {
    const response = await fetchWithRetry('https://api.cohere.ai/v1/rerank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'rerank-v3.5',
        query,
        documents,
        top_n: topN
      })
    });

    const body = await response.json();

    if (!response.ok) {
      handleAPIError(this.name, response, body);
    }

    return body.results || [];
  }
}
