# CSRF Protection Implementation

This document describes the CSRF (Cross-Site Request Forgery) protection implementation for the TrialClinIQ application.

## Overview

CSRF protection has been implemented across the application to protect against cross-site request forgery attacks. The implementation uses a token-based approach with server-side validation and client-side automatic token management.

## Architecture

### Backend Components

#### 1. CSRF Utilities (`netlify/functions/csrf-utils.ts`)

Core CSRF token generation and validation logic:

- **`generateCsrfToken()`**: Generates a cryptographically secure CSRF token
  - Format: `base64(randomBytes).timestamp.signature`
  - Uses 256-bit random tokens
  - Includes HMAC signature for integrity verification
  - Tokens expire after 1 hour

- **`validateCsrfToken(token)`**: Validates a CSRF token
  - Verifies HMAC signature using timing-safe comparison
  - Checks token expiration (1 hour lifetime)
  - Returns boolean indicating validity

- **`getCsrfTokenFromHeaders(headers)`**: Extracts CSRF token from request headers
  - Checks `X-CSRF-Token` header
  - Supports both uppercase and lowercase variations

- **`corsWithCsrf(statusCode, body, additionalHeaders)`**: Helper for CORS responses
  - Includes CSRF header support in CORS configuration
  - Adds `access-control-expose-headers` for `x-csrf-token`

#### 2. CSRF Token Endpoint (`netlify/functions/csrf-token.ts`)

Provides CSRF tokens to the frontend:

- **Endpoint**: `GET /api/csrf-token`
- **Response**: Returns a new CSRF token with expiration time
- **Headers**: Token is included in both response body and `X-CSRF-Token` header
- **No Authentication Required**: This endpoint is publicly accessible

#### 3. Protected Endpoints

The following backend functions now validate CSRF tokens:

- **`profile-write.ts`**: Patient profile updates
- **`provider-write.ts`**: Provider profile updates
- **`upload-file.ts`**: File uploads
- **`express-interest.ts`**: Trial interest submissions
- **`book-demo.ts`**: Demo booking and contact form submissions

Each protected endpoint:
1. Checks for CSRF token in request headers
2. Validates token integrity and expiration
3. Returns `403 Forbidden` if token is missing or invalid
4. Proceeds with normal authentication/authorization if valid

### Frontend Components

#### 1. CSRF Management (`src/lib/csrf.ts`)

Client-side CSRF token management:

- **`initializeCsrfProtection()`**: Initializes CSRF on app load
  - Fetches initial CSRF token
  - Called automatically when app starts

- **`getCsrfToken()`**: Returns current valid CSRF token
  - Fetches new token if expired or missing
  - Tokens are refreshed 5 minutes before expiration

- **`addCsrfHeader(headers)`**: Adds CSRF token to request headers
  - Helper function for adding `X-CSRF-Token` header
  - Used by all state-changing requests

- **`csrfFetch(url, options)`**: Enhanced fetch wrapper
  - Automatically includes CSRF token for POST/PUT/DELETE/PATCH requests
  - Can be used as drop-in replacement for fetch

- **Token Storage**: Tokens are stored in memory (not localStorage)
  - More secure than localStorage
  - Cleared on page reload
  - Cleared on logout

#### 2. Updated API Calls

The following frontend modules have been updated to include CSRF tokens:

- **`src/lib/storage.ts`**:
  - `savePatientProfile()`
  - `uploadPatientFiles()`
  - `saveProviderProfile()`

- **`src/lib/trialInterests.ts`**:
  - `expressInterestInTrial()`

- **`src/screens/support/BookDemo.tsx`**:
  - Demo booking form submission

- **`src/routes/LandingPage.tsx`**:
  - Sponsor demo request
  - Patient waitlist signup
  - Newsletter signup

- **`src/routes/ContactPage.tsx`**:
  - Contact form submission

## Security Features

### Token Generation

- **Cryptographic Strength**: Uses Node.js `crypto.randomBytes()` for token generation
- **HMAC Signature**: Tokens are signed with HMAC-SHA256 to prevent tampering
- **Timing-Safe Comparison**: Uses `crypto.timingSafeEqual()` to prevent timing attacks
- **Expiration**: 1-hour token lifetime with automatic refresh

### Token Storage

- **In-Memory Storage**: Tokens stored in JavaScript variables, not localStorage
- **No Persistence**: Tokens cleared on page reload
- **Automatic Refresh**: Tokens refreshed before expiration

### CORS Configuration

Updated CORS headers to support CSRF tokens:
- `access-control-allow-headers`: Includes `x-csrf-token`
- `access-control-expose-headers`: Exposes `x-csrf-token`

## Environment Variables

Add the following environment variable for production:

```bash
CSRF_SECRET=<your-secret-key-here>
```

**Important**: Use a strong, random secret in production. You can generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Testing

### Test CSRF Protection

1. **Valid Request**:
```bash
# Get CSRF token
curl http://localhost:8888/api/csrf-token

# Use token in request
curl -X POST http://localhost:8888/api/book-demo \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token-from-above>" \
  -d '{"name":"Test","email":"test@example.com"}'
```

2. **Invalid Token**:
```bash
curl -X POST http://localhost:8888/api/book-demo \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: invalid-token" \
  -d '{"name":"Test","email":"test@example.com"}'
```
Expected: `403 Forbidden` with error message

3. **Missing Token**:
```bash
curl -X POST http://localhost:8888/api/book-demo \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}'
```
Expected: `403 Forbidden` with error message

## Migration Notes

### Breaking Changes

All state-changing endpoints now require CSRF tokens. Clients must:
1. Fetch a CSRF token before making state-changing requests
2. Include the token in `X-CSRF-Token` header

### Backward Compatibility

- **GET requests**: No CSRF token required
- **Public endpoints**: CSRF token endpoint is publicly accessible
- **Fallback behavior**: Frontend includes localStorage fallback for some operations

## Best Practices

1. **Always use `addCsrfHeader()`** when making state-changing requests
2. **Don't store tokens in localStorage** - use the provided in-memory storage
3. **Initialize CSRF early** - `initializeCsrfProtection()` is called on app load
4. **Handle token expiration** - Use `getCsrfToken()` which auto-refreshes
5. **Clear tokens on logout** - Call `clearCsrfToken()` when user logs out

## Troubleshooting

### "Missing CSRF token" error

**Cause**: Frontend didn't include CSRF token in request
**Solution**: Ensure you're using `addCsrfHeader()` or `csrfFetch()`

### "Invalid or expired CSRF token" error

**Cause**: Token is expired, tampered with, or generated with different secret
**Solution**:
- Check `CSRF_SECRET` environment variable is consistent
- Ensure token hasn't expired (1 hour lifetime)
- Verify no proxy is modifying tokens

### Token not refreshing

**Cause**: `initializeCsrfProtection()` not called
**Solution**: Verify App.tsx includes the initialization in useEffect

### CORS issues with CSRF header

**Cause**: Server not exposing `x-csrf-token` header
**Solution**: Verify `corsWithCsrf()` or updated `cors-utils.ts` is being used

## Future Enhancements

Potential improvements for the CSRF implementation:

1. **Token Rotation**: Rotate tokens more frequently for high-security operations
2. **Per-Session Tokens**: Tie tokens to user sessions
3. **Double-Submit Cookie**: Add additional cookie-based CSRF protection
4. **Rate Limiting**: Add rate limits to token generation endpoint
5. **Monitoring**: Add logging/alerting for CSRF validation failures

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [Web Security Best Practices](https://developer.mozilla.org/en-US/docs/Web/Security)
