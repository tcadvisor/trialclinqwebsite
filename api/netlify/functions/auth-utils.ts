/**
 * Authentication Utilities for Azure Entra ID (formerly Azure AD)
 *
 * This module provides secure JWT token verification for Azure Entra ID tokens.
 *
 * SECURITY FEATURES:
 * - JWT signature verification using RS256 algorithm
 * - JWKS (JSON Web Key Set) fetching from Azure AD with caching
 * - Token expiration validation
 * - Issuer validation (Azure AD tenant)
 * - Audience validation (Azure AD client ID)
 * - Rate limiting on JWKS requests
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 * - VITE_AZURE_TENANT_ID or AZURE_TENANT_ID: Your Azure tenant ID
 * - VITE_AZURE_CLIENT_ID or AZURE_CLIENT_ID: Your Azure application client ID (optional, for audience validation)
 *
 * USAGE:
 * ```typescript
 * const user = await verifyAndDecodeToken(authHeader);
 * // user contains verified information from the JWT token
 * ```
 *
 * @module auth-utils
 */

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import crypto from 'crypto';
import { query } from './db';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'patient' | 'provider' | 'researcher';
  tenantId: string;
  oid: string; // Object ID from Azure
}

// JWKS client with caching
let jwksClientInstance: jwksClient.JwksClient | null = null;

/**
 * Get or create JWKS client with caching
 */
function getJwksClient(): jwksClient.JwksClient {
  if (!jwksClientInstance) {
    const tenantId = process.env.VITE_AZURE_TENANT_ID || process.env.AZURE_TENANT_ID;

    if (!tenantId) {
      throw new Error('Azure tenant ID not configured');
    }

    jwksClientInstance = jwksClient({
      jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: 3600000, // Cache for 1 hour
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  return jwksClientInstance;
}

/**
 * Get signing key for JWT verification
 */
async function getSigningKey(kid: string): Promise<string> {
  try {
    const client = getJwksClient();
    const key = await client.getSigningKey(kid);
    return key.getPublicKey();
  } catch (error) {
    console.error('Failed to get signing key:', error);
    throw new Error('Failed to validate token signature');
  }
}

/**
 * Verify and decode Azure Entra ID token with proper signature verification
 */
export async function verifyAndDecodeToken(authHeader: string): Promise<AuthenticatedUser> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7);

  try {
    // Get tenant ID and client ID from environment
    const tenantId = process.env.VITE_AZURE_TENANT_ID || process.env.AZURE_TENANT_ID;
    const clientId = process.env.VITE_AZURE_CLIENT_ID || process.env.AZURE_CLIENT_ID;

    if (!tenantId) {
      throw new Error('Azure tenant ID not configured');
    }

    // Decode token header to get the key ID (kid)
    const decodedHeader = jwt.decode(token, { complete: true });

    if (!decodedHeader || typeof decodedHeader === 'string') {
      throw new Error('Invalid token format');
    }

    const { kid } = decodedHeader.header;

    if (!kid) {
      throw new Error('Token missing key ID (kid)');
    }

    // Get the signing key
    const signingKey = await getSigningKey(kid);

    // Verify token signature and validate claims
    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ['RS256'],
      issuer: [
        `https://login.microsoftonline.com/${tenantId}/v2.0`,
        `https://sts.windows.net/${tenantId}/`,
      ],
    };

    // Add audience validation if client ID is configured
    if (clientId) {
      verifyOptions.audience = clientId;
    }

    // Verify the token
    const decoded = jwt.verify(token, signingKey, verifyOptions) as any;

    // Validate expiration (jwt.verify already does this, but we check explicitly)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error('Token has expired');
    }

    // Extract user information
    const user: AuthenticatedUser = {
      userId: decoded.oid || decoded.sub || decoded.unique_name || '',
      email: decoded.email || decoded.unique_name || decoded.upn || decoded.preferred_username || '',
      firstName: decoded.given_name || '',
      lastName: decoded.family_name || '',
      role: decoded.role || decoded.roles?.[0] || 'patient',
      tenantId: decoded.tid || tenantId || '',
      oid: decoded.oid || '',
    };

    if (!user.userId || !user.email) {
      throw new Error('Invalid token: missing user ID or email');
    }

    return user;
  } catch (error: any) {
    console.error('Token verification failed:', error);

    // Provide more specific error messages
    if (error.name === 'TokenExpiredError') {
      throw new Error('Unauthorized: Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error(`Unauthorized: Invalid token - ${error.message}`);
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Unauthorized: Token not yet valid');
    }

    throw new Error(`Unauthorized: ${error.message}`);
  }
}

/**
 * Verify a simpleAuth session token (from httpOnly cookie or Bearer header).
 * These are random hex tokens hashed with SHA-256 and stored in the sessions table.
 */
async function verifySessionToken(token: string): Promise<AuthenticatedUser> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const result = await query(
    `SELECT s.user_id, u.email, u.first_name, u.last_name, u.role
     FROM sessions s
     JOIN users u ON s.user_id = u.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired session token');
  }

  const row = result.rows[0];
  return {
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    role: row.role || 'patient',
    tenantId: '',
    oid: '',
  };
}

/**
 * Extract user info from Authorization header or session cookie.
 * Supports both Azure Entra ID JWTs and simpleAuth session tokens.
 */
export async function getUserFromAuthHeader(authHeader?: string, cookieHeader?: string): Promise<AuthenticatedUser> {
  // Try Bearer token first (could be Azure JWT or simpleAuth token)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // If it looks like a JWT (has dots), try Azure verification
    if (token.includes('.')) {
      try {
        return await verifyAndDecodeToken(authHeader);
      } catch {
        // not a valid Azure JWT, fall through
      }
    }

    // Otherwise treat it as a simpleAuth session token
    try {
      return await verifySessionToken(token);
    } catch {
      // fall through to cookie check
    }
  }

  // Try session cookie (simpleAuth httpOnly cookie)
  if (cookieHeader) {
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match?.[1]) {
      return await verifySessionToken(match[1]);
    }
  }

  throw new Error('Missing or invalid authentication');
}

/**
 * Check if user has permission to access a specific patient/patient's data
 */
export function canAccessPatient(
  authenticatedUser: AuthenticatedUser,
  targetPatientId: string
): boolean {
  // Patients can only access their own data
  if (authenticatedUser.role === 'patient') {
    return authenticatedUser.userId === targetPatientId;
  }

  // Researchers/Providers can access data they're authorized for
  // TODO: Implement role-based access control (RBAC)
  // This would check a permissions table or Azure AD groups
  return true;
}

/**
 * Check if researcher/provider owns the profile
 */
export function isResearcherOwner(
  authenticatedUser: AuthenticatedUser,
  researcherId: string
): boolean {
  return authenticatedUser.userId === researcherId || authenticatedUser.role === 'provider';
}

/**
 * Generate internal user ID for database
 * Uses Azure OID (Object ID) for consistency across systems
 */
export function generateInternalUserId(azureOid: string): string {
  return `azure-${azureOid}`;
}

/**
 * Verify token and get user from event or auth header string
 * Accepts either a HandlerEvent object or an auth header string for backward compatibility
 */
export async function verifyTokenAndGetUser(eventOrAuthHeader: any): Promise<AuthenticatedUser> {
  // If it's a string, treat it as an auth header
  if (typeof eventOrAuthHeader === 'string') {
    return getUserFromAuthHeader(eventOrAuthHeader);
  }

  // If it's an event object, extract auth header and cookies
  const authHeader = eventOrAuthHeader?.headers?.authorization ||
                     eventOrAuthHeader?.headers?.Authorization || '';
  const cookieHeader = eventOrAuthHeader?.headers?.cookie || '';

  return getUserFromAuthHeader(authHeader || undefined, cookieHeader || undefined);
}
