/**
 * CSRF Token Management for Frontend
 *
 * This module handles CSRF token fetching, storage, and automatic inclusion
 * in all state-changing requests (POST, PUT, DELETE).
 *
 * The token is stored in memory (not localStorage) for security.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// In-memory storage for CSRF token (more secure than localStorage)
let csrfToken: string | null = null;
let tokenExpiresAt: number | null = null;

/**
 * Fetch a new CSRF token from the server
 */
export async function fetchCsrfToken(): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/csrf-token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch CSRF token:', response.status);
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();

    if (!data.csrfToken) {
      throw new Error('No CSRF token in response');
    }

    // Store token and calculate expiration time
    csrfToken = data.csrfToken;

    // Token expires in 1 hour, refresh 5 minutes before expiration
    const expiresInMs = (data.expiresIn || 3600) * 1000;
    const refreshBufferMs = 5 * 60 * 1000; // 5 minutes
    tokenExpiresAt = Date.now() + expiresInMs - refreshBufferMs;

    console.log('✅ CSRF token fetched successfully');

    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Get the current CSRF token, fetching a new one if needed
 */
export async function getCsrfToken(): Promise<string> {
  // If we have a valid token that hasn't expired, return it
  if (csrfToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return csrfToken;
  }

  // Otherwise, fetch a new token
  return await fetchCsrfToken();
}

/**
 * Clear the stored CSRF token (useful for logout)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
  tokenExpiresAt = null;
  console.log('🧹 CSRF token cleared');
}

/**
 * Initialize CSRF protection by fetching the initial token
 * This should be called when the app loads
 */
export async function initializeCsrfProtection(): Promise<void> {
  try {
    await fetchCsrfToken();
    console.log('✅ CSRF protection initialized');
  } catch (error) {
    console.error('Failed to initialize CSRF protection:', error);
    // Don't throw - allow app to continue, individual requests will fail with proper error
  }
}

/**
 * Helper to add CSRF token to request headers
 * Use this for all state-changing requests (POST, PUT, DELETE)
 */
export async function addCsrfHeader(headers: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getCsrfToken();

  return {
    ...headers,
    'X-CSRF-Token': token,
  };
}

/**
 * Enhanced fetch wrapper that automatically includes CSRF token for state-changing requests
 */
export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';

  // Only add CSRF token for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    try {
      const token = await getCsrfToken();
      options.headers = {
        ...options.headers,
        'X-CSRF-Token': token,
      };
    } catch (error) {
      console.error('Failed to get CSRF token for request:', error);
      // Continue with request - server will reject it with proper error
    }
  }

  return fetch(url, options);
}

/**
 * Setup automatic CSRF token refresh
 * This will refresh the token periodically to ensure it's always valid
 */
export function setupCsrfTokenRefresh(): void {
  // Refresh token every 50 minutes (token expires in 1 hour)
  const refreshIntervalMs = 50 * 60 * 1000;

  setInterval(async () => {
    try {
      await fetchCsrfToken();
      console.log('🔄 CSRF token refreshed automatically');
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
    }
  }, refreshIntervalMs);
}
