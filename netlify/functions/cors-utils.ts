/**
 * CORS Utility for Netlify Functions
 *
 * This module provides secure CORS handling by validating request origins
 * against a whitelist of allowed origins from the ALLOWED_ORIGINS environment variable.
 *
 * Environment Variables:
 * - ALLOWED_ORIGINS: Comma-separated list of allowed origins (e.g., "https://trialcliniq.com,https://www.trialcliniq.com")
 * - If not set, defaults to localhost origins for development
 */

interface CorsHeaders {
  "access-control-allow-origin": string;
  "access-control-allow-methods": string;
  "access-control-allow-headers": string;
  "access-control-allow-credentials"?: string;
  "content-type"?: string;
  [key: string]: string | undefined;
}

interface CorsResponse {
  statusCode: number;
  headers: CorsHeaders;
  body: string;
}

/**
 * Get allowed origins from environment variable
 * Falls back to common localhost origins for development if not set
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  if (envOrigins) {
    // Parse comma-separated list and trim whitespace
    return envOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
  }

  // Default allowed origins for development
  // In production, ALLOWED_ORIGINS MUST be set
  return [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000',
  ];
}

/**
 * Validate if the request origin is in the allowed list
 * @param origin - The Origin header from the request
 * @returns The origin if valid, or the first allowed origin as fallback
 */
function validateOrigin(origin: string | undefined): string {
  const allowedOrigins = getAllowedOrigins();

  // If no origin header (e.g., same-origin requests), use first allowed origin
  if (!origin) {
    console.warn('[CORS] No origin header present, using first allowed origin');
    return allowedOrigins[0] || 'null';
  }

  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  // Log unauthorized origin attempt
  console.warn(`[CORS] Rejected origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);

  // Return first allowed origin (this means the request will succeed but client won't have CORS access)
  return allowedOrigins[0] || 'null';
}

/**
 * Get CORS headers for a given request origin
 * @param origin - The Origin header from the request
 * @param methods - Allowed HTTP methods (default: "GET,POST,PUT,DELETE,OPTIONS")
 * @param headers - Allowed request headers (default: "content-type,authorization")
 * @param credentials - Whether to allow credentials (default: false)
 * @returns CORS headers object
 */
export function getCorsHeaders(
  origin: string | undefined,
  methods: string = "GET,POST,PUT,DELETE,OPTIONS",
  headers: string = "content-type,authorization,x-csrf-token,x-user-id,x-patient-id",
  credentials: boolean = false
): CorsHeaders {
  const validatedOrigin = validateOrigin(origin);

  const corsHeaders: CorsHeaders = {
    "access-control-allow-origin": validatedOrigin,
    "access-control-allow-methods": methods,
    "access-control-allow-headers": headers,
    "access-control-expose-headers": "x-csrf-token",
  };

  // Only add credentials header if explicitly enabled
  if (credentials) {
    corsHeaders["access-control-allow-credentials"] = "true";
  }

  return corsHeaders;
}

/**
 * Create a CORS-enabled response
 * @param statusCode - HTTP status code
 * @param body - Response body (will be JSON stringified if not a string)
 * @param origin - The Origin header from the request
 * @param methods - Allowed HTTP methods
 * @param headers - Allowed request headers
 * @param additionalHeaders - Additional headers to include in the response
 * @returns Complete response object with CORS headers
 */
export function corsResponse(
  statusCode: number,
  body: any,
  origin: string | undefined,
  methods: string = "GET,POST,PUT,DELETE,OPTIONS",
  headers: string = "content-type,authorization,x-csrf-token,x-user-id,x-patient-id",
  additionalHeaders: Record<string, string> = {}
): CorsResponse {
  const corsHeaders = getCorsHeaders(origin, methods, headers);

  return {
    statusCode,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
      ...additionalHeaders,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

/**
 * Handle OPTIONS preflight requests
 * @param origin - The Origin header from the request
 * @param methods - Allowed HTTP methods
 * @param headers - Allowed request headers
 * @returns CORS response for OPTIONS request
 */
export function handleOptions(
  origin: string | undefined,
  methods: string = "GET,POST,PUT,DELETE,OPTIONS",
  headers: string = "content-type,authorization,x-csrf-token,x-user-id,x-patient-id"
): CorsResponse {
  return corsResponse(204, "", origin, methods, headers);
}

/**
 * Create a CORS helper function bound to a specific request
 * This is the recommended way to use CORS in Netlify functions
 *
 * @example
 * ```typescript
 * import { createCorsHandler } from "./cors-utils";
 *
 * export const handler: Handler = async (event) => {
 *   const cors = createCorsHandler(event);
 *
 *   if (event.httpMethod === "OPTIONS") {
 *     return cors.handleOptions();
 *   }
 *
 *   if (event.httpMethod !== "POST") {
 *     return cors.response(405, { error: "Method not allowed" });
 *   }
 *
 *   // Your logic here...
 *   return cors.response(200, { ok: true, data: result });
 * };
 * ```
 */
export function createCorsHandler(event: any) {
  const origin = event.headers?.origin || event.headers?.Origin;

  return {
    /**
     * Create a CORS response
     */
    response: (
      statusCode: number,
      body: any,
      methods?: string,
      additionalHeaders?: Record<string, string>
    ) => {
      return corsResponse(
        statusCode,
        body,
        origin,
        methods,
        undefined,
        additionalHeaders
      );
    },

    /**
     * Handle OPTIONS preflight
     */
    handleOptions: (methods?: string) => {
      return handleOptions(origin, methods);
    },

    /**
     * Get just the CORS headers (for custom response construction)
     */
    getHeaders: (methods?: string) => {
      return getCorsHeaders(origin, methods);
    },
  };
}
