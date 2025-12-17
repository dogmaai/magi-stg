/**
 * Identity Token Utility
 * Cloud Run service-to-service authentication
 *
 * @version 1.0
 * @description Phase 4: Shared AI providers package
 */

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get Google Cloud Identity Token
 * @param {string} targetAudience - Target service URL
 * @returns {Promise<string>} Identity Token
 */
export async function getIdentityToken(targetAudience) {
  const now = Date.now();

  // Return cached token if still valid (refresh 5 min before expiry)
  if (cachedToken && tokenExpiry > now + 300000) {
    return cachedToken;
  }

  try {
    // Get token from metadata server
    const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${targetAudience}`;
    const response = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' }
    });

    if (!response.ok) {
      throw new Error(`Metadata server error: ${response.status}`);
    }

    cachedToken = await response.text();
    tokenExpiry = now + 3600000; // 1 hour validity

    return cachedToken;
  } catch (error) {
    console.error('[IDENTITY] Token fetch failed:', error.message);
    // Return null for local environment
    return null;
  }
}

/**
 * Generate auth headers
 */
export async function getAuthHeaders(targetAudience) {
  const token = await getIdentityToken(targetAudience);
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

/**
 * Clear token cache (for testing)
 */
export function clearTokenCache() {
  cachedToken = null;
  tokenExpiry = 0;
}
