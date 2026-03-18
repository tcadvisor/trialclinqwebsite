import { randomBytes, createHmac, timingSafeEqual } from "crypto";

// CSRF token configuration
const TOKEN_BYTE_LENGTH = 32; // 256 bits
const TOKEN_EXPIRY_MS = 3600000; // 1 hour
const HMAC_ALGORITHM = "sha256";

// Secret key for HMAC signing - should be set in environment variables
const CSRF_SECRET = process.env.CSRF_SECRET || "default-csrf-secret-change-in-production";

interface CsrfToken {
  token: string;
  timestamp: number;
}

/**
 * Generate a cryptographically secure CSRF token
 * Format: base64(randomBytes).timestamp.signature
 */
export function generateCsrfToken(): string {
  const randomToken = randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
  const timestamp = Date.now();
  const payload = `${randomToken}.${timestamp}`;

  // Sign the payload with HMAC
  const signature = createHmac(HMAC_ALGORITHM, CSRF_SECRET)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

/**
 * Parse CSRF token into its components
 */
function parseCsrfToken(token: string): CsrfToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [randomPart, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      return null;
    }

    return {
      token: `${randomPart}.${timestampStr}`,
      timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Verify HMAC signature of CSRF token
 */
function verifySignature(token: string, signature: string): boolean {
  try {
    const expectedSignature = createHmac(HMAC_ALGORITHM, CSRF_SECRET)
      .update(token)
      .digest("base64url");

    // Use timing-safe comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(signature, "base64url");
    const expectedBuffer = Buffer.from(expectedSignature, "base64url");

    if (tokenBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(tokenBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Validate a CSRF token
 * Returns true if token is valid and not expired
 */
export function validateCsrfToken(token: string): boolean {
  if (!token || typeof token !== "string") {
    console.warn("CSRF validation failed: Missing or invalid token");
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    console.warn("CSRF validation failed: Invalid token format");
    return false;
  }

  const [randomPart, timestampStr, signature] = parts;
  const parsed = parseCsrfToken(token);

  if (!parsed) {
    console.warn("CSRF validation failed: Could not parse token");
    return false;
  }

  // Verify signature
  if (!verifySignature(parsed.token, signature)) {
    console.warn("CSRF validation failed: Invalid signature");
    return false;
  }

  // Check if token is expired
  const now = Date.now();
  const age = now - parsed.timestamp;

  if (age > TOKEN_EXPIRY_MS) {
    console.warn("CSRF validation failed: Token expired", {
      age: Math.floor(age / 1000) + "s",
      maxAge: Math.floor(TOKEN_EXPIRY_MS / 1000) + "s",
    });
    return false;
  }

  if (age < 0) {
    console.warn("CSRF validation failed: Token timestamp is in the future");
    return false;
  }

  return true;
}

/**
 * Extract CSRF token from request headers
 */
export function getCsrfTokenFromHeaders(headers: Record<string, string | string[] | undefined>): string | null {
  // Check X-CSRF-Token header (most common)
  const csrfHeader = headers["x-csrf-token"] || headers["X-CSRF-Token"];
  if (csrfHeader && typeof csrfHeader === "string") {
    return csrfHeader;
  }

  // Also check alternative header name
  const altHeader = headers["csrf-token"] || headers["CSRF-Token"];
  if (altHeader && typeof altHeader === "string") {
    return altHeader;
  }

  return null;
}

/**
 * CORS headers helper that includes CSRF token header in allowed headers
 * @deprecated Use createCorsHandler from cors-utils.ts instead for proper origin validation
 * This function is kept for backward compatibility but should not be used in new code
 */
export function corsWithCsrf(statusCode: number, body: any, additionalHeaders: Record<string, string> = {}) {
  console.warn('[DEPRECATED] corsWithCsrf is deprecated. Use createCorsHandler from cors-utils.ts instead.');
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,authorization,x-csrf-token,x-user-id,x-patient-id",
      "access-control-expose-headers": "x-csrf-token",
      "content-type": "application/json",
      ...additionalHeaders,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

/**
 * Alias for validateCsrfToken - backward compatibility
 */
export const verifyCsrfToken = validateCsrfToken;
