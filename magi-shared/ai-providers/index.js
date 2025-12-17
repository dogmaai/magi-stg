/**
 * MAGI AI Providers
 * 統合エクスポート
 */

export { BaseAIProvider } from './base-provider.js';
export { GrokProvider } from './grok.js';
export { GeminiProvider } from './gemini.js';
export { ClaudeProvider } from './claude.js';
export { MistralProvider } from './mistral.js';
export { OpenAIProvider } from './openai.js';
export { GroqProvider } from './groq.js';
export { CohereProvider } from './cohere.js';

export { getIdentityToken, getAuthHeaders } from './utils/identity-token.js';
export { AIProviderError, handleAPIError, fetchWithRetry } from './utils/error-handler.js';

/**
 * 全プロバイダーを一括初期化
 */
export function initializeProviders(apiKeys) {
  const providers = {};

  if (apiKeys.GROK_API_KEY) {
    providers.grok = new GrokProvider(apiKeys.GROK_API_KEY);
  }
  if (apiKeys.GEMINI_API_KEY) {
    providers.gemini = new GeminiProvider(apiKeys.GEMINI_API_KEY);
  }
  if (apiKeys.ANTHROPIC_API_KEY) {
    providers.claude = new ClaudeProvider(apiKeys.ANTHROPIC_API_KEY);
  }
  if (apiKeys.MISTRAL_API_KEY) {
    providers.mistral = new MistralProvider(apiKeys.MISTRAL_API_KEY);
  }
  if (apiKeys.OPENAI_API_KEY) {
    providers.openai = new OpenAIProvider(apiKeys.OPENAI_API_KEY);
  }
  if (apiKeys.GROQ_API_KEY) {
    providers.groq = new GroqProvider(apiKeys.GROQ_API_KEY);
  }
  if (apiKeys.COHERE_API_KEY) {
    providers.cohere = new CohereProvider(apiKeys.COHERE_API_KEY);
  }

  return providers;
}

/**
 * 4AI並列分析実行
 */
export async function run4AIAnalysis(providers, symbol, stockData, context, constitution) {
  const results = await Promise.allSettled([
    providers.grok?.analyzeStock(symbol, stockData, context, constitution),
    providers.gemini?.analyzeStock(symbol, stockData, context, constitution),
    providers.claude?.analyzeStock(symbol, stockData, context, constitution),
    providers.mistral?.analyzeStock(symbol, stockData, context, constitution)
  ]);

  return {
    grok: results[0].status === 'fulfilled' ? results[0].value : null,
    gemini: results[1].status === 'fulfilled' ? results[1].value : null,
    claude: results[2].status === 'fulfilled' ? results[2].value : null,
    mistral: results[3].status === 'fulfilled' ? results[3].value : null
  };
}
