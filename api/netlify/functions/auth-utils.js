"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAndDecodeToken = verifyAndDecodeToken;
exports.getUserFromAuthHeader = getUserFromAuthHeader;
exports.canAccessPatient = canAccessPatient;
exports.isResearcherOwner = isResearcherOwner;
exports.generateInternalUserId = generateInternalUserId;
exports.verifyTokenAndGetUser = verifyTokenAndGetUser;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
// JWKS client with caching
let jwksClientInstance = null;
/**
 * Get or create JWKS client with caching
 */
function getJwksClient() {
    if (!jwksClientInstance) {
        const tenantId = process.env.VITE_AZURE_TENANT_ID || process.env.AZURE_TENANT_ID;
        if (!tenantId) {
            throw new Error('Azure tenant ID not configured');
        }
        jwksClientInstance = (0, jwks_rsa_1.default)({
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
async function getSigningKey(kid) {
    try {
        const client = getJwksClient();
        const key = await client.getSigningKey(kid);
        return key.getPublicKey();
    }
    catch (error) {
        console.error('Failed to get signing key:', error);
        throw new Error('Failed to validate token signature');
    }
}
/**
 * Verify and decode Azure Entra ID token with proper signature verification
 */
async function verifyAndDecodeToken(authHeader) {
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
        const decodedHeader = jsonwebtoken_1.default.decode(token, { complete: true });
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
        const verifyOptions = {
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
        const decoded = jsonwebtoken_1.default.verify(token, signingKey, verifyOptions);
        // Validate expiration (jwt.verify already does this, but we check explicitly)
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < now) {
            throw new Error('Token has expired');
        }
        // Extract user information
        const user = {
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
    }
    catch (error) {
        console.error('Token verification failed:', error);
        // Provide more specific error messages
        if (error.name === 'TokenExpiredError') {
            throw new Error('Unauthorized: Token has expired');
        }
        else if (error.name === 'JsonWebTokenError') {
            throw new Error(`Unauthorized: Invalid token - ${error.message}`);
        }
        else if (error.name === 'NotBeforeError') {
            throw new Error('Unauthorized: Token not yet valid');
        }
        throw new Error(`Unauthorized: ${error.message}`);
    }
}
/**
 * Extract user info from Authorization header
 */
async function getUserFromAuthHeader(authHeader) {
    if (!authHeader) {
        throw new Error('Missing Authorization header');
    }
    return verifyAndDecodeToken(authHeader);
}
/**
 * Check if user has permission to access a specific patient/patient's data
 */
function canAccessPatient(authenticatedUser, targetPatientId) {
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
function isResearcherOwner(authenticatedUser, researcherId) {
    return authenticatedUser.userId === researcherId || authenticatedUser.role === 'provider';
}
/**
 * Generate internal user ID for database
 * Uses Azure OID (Object ID) for consistency across systems
 */
function generateInternalUserId(azureOid) {
    return `azure-${azureOid}`;
}
/**
 * Verify token and get user from event or auth header string
 * Accepts either a HandlerEvent object or an auth header string for backward compatibility
 */
async function verifyTokenAndGetUser(eventOrAuthHeader) {
    // If it's a string, treat it as an auth header
    if (typeof eventOrAuthHeader === 'string') {
        return verifyAndDecodeToken(eventOrAuthHeader);
    }
    // If it's an event object, extract the auth header
    const authHeader = eventOrAuthHeader?.headers?.authorization ||
        eventOrAuthHeader?.headers?.Authorization || '';
    if (!authHeader) {
        throw new Error('Missing Authorization header');
    }
    return verifyAndDecodeToken(authHeader);
}
