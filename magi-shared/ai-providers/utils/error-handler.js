/**
 * AI Provider共通エラーハンドラー
 */

export class AIProviderError extends Error {
  constructor(provider, message, statusCode = null, originalError = null) {
    super(`[${provider}] ${message}`);
    this.name = 'AIProviderError';
    this.provider = provider;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

/**
 * APIレスポンスエラーをハンドル
 */
export function handleAPIError(provider, response, body) {
  const statusCode = response.status;
  let message = `API error: ${statusCode}`;

  if (body?.error?.message) {
    message = body.error.message;
  } else if (body?.message) {
    message = body.message;
  } else if (typeof body === 'string') {
    message = body.substring(0, 200);
  }

  throw new AIProviderError(provider, message, statusCode);
}

/**
 * リトライ付きfetch
 */
export async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.warn(`[RETRY] Attempt ${i + 1} failed, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}
