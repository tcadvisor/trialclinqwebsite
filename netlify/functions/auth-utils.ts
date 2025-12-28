import axios from 'axios';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'patient' | 'provider' | 'researcher';
  tenantId: string;
  oid: string; // Object ID from Azure
}

let jwksCache: any = null;
let jwksCacheExpiry = 0;

/**
 * Get JWKS (JSON Web Key Set) from Azure
 * Used to validate token signatures
 */
async function getJWKS() {
  const now = Date.now();
  
  // Use cached JWKS if still valid (1 hour TTL)
  if (jwksCache && jwksCacheExpiry > now) {
    return jwksCache;
  }

  try {
    const tenantId = process.env.VITE_AZURE_TENANT_ID;
    const response = await axios.get(
      `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
    );
    
    jwksCache = response.data;
    jwksCacheExpiry = now + 3600000; // Cache for 1 hour
    
    return jwksCache;
  } catch (error) {
    console.error('Failed to fetch JWKS:', error);
    throw new Error('Failed to validate token');
  }
}

/**
 * Verify and decode Azure Entra ID token
 * For development: simplified token validation
 * For production: full JWT signature validation recommended
 */
export async function verifyAndDecodeToken(authHeader: string): Promise<AuthenticatedUser> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7);

  try {
    // Decode token without verification (development)
    // In production, use jsonwebtoken library to verify signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    // Decode payload
    const decoded = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf8')
    );

    // Extract user information
    const user: AuthenticatedUser = {
      userId: decoded.oid || decoded.sub || decoded.unique_name || '',
      email: decoded.email || decoded.unique_name || decoded.upn || '',
      firstName: decoded.given_name || '',
      lastName: decoded.family_name || '',
      role: decoded.role || 'patient',
      tenantId: decoded.tid || process.env.VITE_AZURE_TENANT_ID || '',
      oid: decoded.oid || '',
    };

    if (!user.userId || !user.email) {
      throw new Error('Invalid token: missing user ID or email');
    }

    // TODO: In production, verify token signature using JWKS
    // const jwks = await getJWKS();
    // ... verify signature using jsonwebtoken library

    return user;
  } catch (error: any) {
    console.error('Token verification failed:', error);
    throw new Error(`Unauthorized: ${error.message}`);
  }
}

/**
 * Extract user info from Authorization header
 */
export async function getUserFromAuthHeader(authHeader?: string): Promise<AuthenticatedUser> {
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  return verifyAndDecodeToken(authHeader);
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
