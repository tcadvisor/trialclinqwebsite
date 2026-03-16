# Security Fixes - Sensitive Data Storage

## Overview

This document describes the security vulnerabilities that were fixed related to plaintext sensitive data storage in localStorage.

## Vulnerabilities Fixed

### 1. Password Storage in accountStore.ts ❌ CRITICAL
**Previous Issue:**
- Passwords were stored in plaintext in localStorage
- Anyone with access to browser DevTools could read passwords
- Passwords persisted across sessions

**Fix Applied:**
- Removed password storage entirely from Account type
- Deprecated `verifyAccount()` function
- Added `removePasswordData()` utility to clean up legacy data
- Added warning comments about proper authentication

**Recommendation:**
- Implement proper backend authentication (OAuth, JWT, etc.)
- Never store passwords client-side
- Use secure session tokens instead

### 2. Health Profile Data in storage.ts ⚠️ HIGH
**Previous Issue:**
- Sensitive health data (medications, conditions, allergies) stored in plaintext
- PHI (Protected Health Information) vulnerable to XSS attacks
- No encryption for offline caching

**Fix Applied:**
- Created encryption utility using Web Crypto API (AES-GCM)
- Updated `cacheProfileLocally()` to encrypt before storing
- Updated `getCachedProfile()` to decrypt on retrieval
- Same fix applied to provider profiles
- Encryption key stored in sessionStorage (cleared on tab close)

**Files Modified:**
- `src/lib/encryption.ts` (new)
- `src/lib/storage.ts`

### 3. EPIC OAuth Tokens in EhrCallback.tsx and epic.ts ⚠️ HIGH
**Previous Issue:**
- OAuth access tokens stored in localStorage
- Refresh tokens stored in localStorage
- Patient data stored in localStorage
- Tokens persisted indefinitely

**Fix Applied:**
- Created token manager for in-memory storage
- Tokens stored in memory, cleared on page refresh
- Updated all token storage/retrieval to use memory
- Added token expiration checking
- Migration utility to remove old localStorage tokens

**Files Modified:**
- `src/lib/tokenManager.ts` (new)
- `src/lib/epic.ts`
- `src/screens/patients/EhrCallback.tsx`
- `src/screens/patients/HealthProfile.tsx`
- `src/lib/patientIdUtils.ts`

## New Files Created

### 1. `src/lib/encryption.ts`
Provides AES-GCM encryption utilities for localStorage:
- `encrypt(plaintext)` - Encrypts string data
- `decrypt(ciphertext)` - Decrypts encrypted data
- `setEncryptedItem(key, value)` - Store encrypted data
- `getEncryptedItem(key)` - Retrieve and decrypt data
- `clearEncryptionKey()` - Clear encryption key on logout

**Key Features:**
- Uses Web Crypto API (industry standard)
- AES-GCM with 256-bit keys
- Random IV for each encryption
- Encryption key stored in sessionStorage (cleared on tab close)

### 2. `src/lib/tokenManager.ts`
Manages OAuth tokens in memory instead of localStorage:
- `setEpicTokens(tokens)` - Store tokens in memory
- `getEpicTokens()` - Retrieve tokens with expiration check
- `clearEpicTokens()` - Clear tokens from memory
- `setEpicPatientData(data)` - Store patient data in memory
- `getEpicPatientData()` - Retrieve patient data
- `migrateFromLocalStorage()` - Clean up old data

**Security Benefits:**
- Tokens cleared on page refresh
- No persistence across sessions
- Automatic expiration checking
- XSS attacks can't steal tokens from localStorage

### 3. `src/lib/securityInit.ts`
Initialization utilities for security:
- `initializeSecurity()` - Call on app startup
- `checkSecuritySupport()` - Verify browser support
- `logSecurityWarnings()` - Log security issues

## Migration Guide

### For Developers

1. **Add to App initialization** (e.g., in `App.tsx` or `main.tsx`):
```typescript
import { initializeSecurity, logSecurityWarnings } from './lib/securityInit';

// On app startup
useEffect(() => {
  initializeSecurity();
  logSecurityWarnings();
}, []);
```

2. **Update function calls** that were changed from sync to async:
```typescript
// OLD (synchronous)
cacheProfileLocally(profile);
const cached = getCachedProfile(patientId);

// NEW (asynchronous)
await cacheProfileLocally(profile);
const cached = await getCachedProfile(patientId);
```

3. **Remove password-related code**:
- Don't use `verifyAccount()` - it now returns null
- Don't include password in Account objects
- Implement proper backend authentication

4. **Access EPIC tokens from memory**:
```typescript
import { getEpicTokens } from './lib/tokenManager';

// Tokens are now in memory, not localStorage
const tokens = getEpicTokens();
```

### For Users

**Action Required:**
1. Users will need to re-authenticate with EPIC (tokens are no longer persisted)
2. Existing cached health profiles will be re-encrypted automatically
3. No data loss - just improved security

## Security Best Practices Going Forward

### DO ✅
- Use encryption for sensitive data in localStorage
- Store tokens in memory when possible
- Use httpOnly cookies for auth tokens (requires backend)
- Implement proper session management
- Use HTTPS in production
- Validate and sanitize all user input
- Implement CSRF protection
- Use Content Security Policy headers

### DON'T ❌
- Never store passwords client-side
- Never store unencrypted PHI in localStorage
- Don't persist tokens longer than necessary
- Don't trust client-side validation alone
- Don't expose sensitive data in URLs
- Don't use weak encryption algorithms

## Further Security Improvements Recommended

### High Priority
1. **Implement httpOnly cookies for tokens**
   - Move token management to backend
   - Set cookies via server-side endpoints
   - Prevents JavaScript access to tokens

2. **Add backend session management**
   - Replace client-side token storage
   - Implement proper session timeout
   - Add session invalidation on logout

3. **Implement proper authentication flow**
   - Remove all password storage code
   - Use OAuth 2.0 or similar
   - Add multi-factor authentication

### Medium Priority
4. **Add Content Security Policy (CSP)**
   - Prevent XSS attacks
   - Restrict script sources
   - Add nonce/hash for inline scripts

5. **Implement rate limiting**
   - Prevent brute force attacks
   - Add exponential backoff
   - Monitor for suspicious activity

6. **Add audit logging**
   - Log authentication events
   - Track data access
   - Monitor for security incidents

### Low Priority
7. **Add data retention policies**
   - Clear old cached data
   - Implement automatic cleanup
   - Respect GDPR/HIPAA requirements

8. **Implement biometric authentication**
   - WebAuthn support
   - Fingerprint/Face ID
   - Passwordless authentication

## Testing

To verify the security fixes:

1. **Check localStorage** (DevTools → Application → Local Storage):
   - No plaintext passwords
   - Health profiles should be encrypted (base64 strings)
   - No EPIC tokens (should be in memory only)

2. **Check sessionStorage** (DevTools → Application → Session Storage):
   - Should only contain encryption key (JWK format)
   - Key should clear on tab close

3. **Test encryption**:
```typescript
import { setEncryptedItem, getEncryptedItem } from './lib/encryption';

// Should encrypt data
await setEncryptedItem('test', { sensitive: 'data' });
const retrieved = await getEncryptedItem('test');
console.log(retrieved); // { sensitive: 'data' }

// Check localStorage - should see encrypted base64
console.log(localStorage.getItem('test')); // Random base64 string
```

4. **Test token expiration**:
```typescript
import { setEpicTokens, getEpicTokens } from './lib/tokenManager';

// Set token with short expiration
setEpicTokens({
  access_token: 'test',
  expires_in: 1, // 1 second
});

// Wait and check
setTimeout(() => {
  console.log(getEpicTokens()); // Should be null (expired)
}, 2000);
```

## Compliance

These fixes help with compliance for:
- **HIPAA**: Encryption of PHI at rest
- **GDPR**: Protection of personal data
- **CCPA**: Security of consumer information
- **SOC 2**: Data encryption and security controls

## Questions?

For security concerns or questions:
1. Review this document
2. Check code comments in modified files
3. Consult security team before making changes
4. Never commit sensitive data to version control

## Summary

✅ **Passwords**: Removed from client-side storage
✅ **Health Data**: Now encrypted with AES-GCM
✅ **OAuth Tokens**: Stored in memory, not localStorage
✅ **Migration**: Automatic cleanup of legacy data
✅ **Documentation**: Comprehensive security guide

**Impact**: Significantly improved security posture for handling sensitive data.
