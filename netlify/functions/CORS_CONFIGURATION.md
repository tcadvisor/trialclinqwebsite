# CORS Configuration for Netlify Functions

## Overview

All Netlify functions have been updated to use a secure CORS utility that validates request origins against a whitelist instead of using the insecure wildcard (`*`) origin.

## Security Improvement

**Before:** All functions used `"access-control-allow-origin": "*"` which allowed any website to make requests to your API endpoints.

**After:** Functions now validate the request origin against a whitelist defined in the `ALLOWED_ORIGINS` environment variable and only return CORS headers for approved origins.

## Configuration

### Setting Allowed Origins

Add the `ALLOWED_ORIGINS` environment variable to your Netlify site settings or `.env` file:

```bash
ALLOWED_ORIGINS=https://trialcliniq.com,https://www.trialcliniq.com,https://app.trialcliniq.com
```

**Important:**
- Use comma-separated values
- Include the full protocol (https://)
- Do not add trailing slashes
- Include all domains and subdomains that need access

### Development Setup

For local development, the CORS utility falls back to localhost origins if `ALLOWED_ORIGINS` is not set:
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:3000`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:5174`
- `http://127.0.0.1:3000`

**For production, you MUST set the `ALLOWED_ORIGINS` environment variable.**

### Netlify Environment Variables

1. Go to your Netlify site dashboard
2. Navigate to Site settings → Environment variables
3. Add a new variable:
   - **Key:** `ALLOWED_ORIGINS`
   - **Value:** Your comma-separated list of allowed origins
   - **Scopes:** All (Production, Deploy Previews, Branch deploys)

## Updated Files

The following files have been updated to use the secure CORS utility:

### Core Functions
- `/netlify/functions/upload-file.ts`
- `/netlify/functions/profile-write.ts`
- `/netlify/functions/get-patient-files.ts`
- `/netlify/functions/whoami.ts`
- `/netlify/functions/provider-write.ts`
- `/netlify/functions/ai-scorer.ts`
- `/netlify/functions/geocode.ts`
- `/netlify/functions/ctgov.ts`
- `/netlify/functions/summarize.ts`
- `/netlify/functions/book-demo.ts`
- `/netlify/functions/express-interest.ts`
- `/netlify/functions/get-trial-interests.ts`

### Utility Files
- `/netlify/functions/cors-utils.ts` (NEW - Secure CORS utility)
- `/netlify/functions/csrf-utils.ts` (Updated - deprecated corsWithCsrf function)

## Usage in Functions

All functions now use the `createCorsHandler` utility:

```typescript
import { createCorsHandler } from "./cors-utils";

export const handler: Handler = async (event) => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("POST,OPTIONS");
  }

  // Your function logic here...

  return cors.response(200, { ok: true, data: result });
};
```

## CORS Utility Features

The `cors-utils.ts` module provides:

1. **Origin Validation**: Only returns CORS headers for whitelisted origins
2. **Security Logging**: Warns when unauthorized origins are rejected
3. **Flexible Configuration**: Easy to add/remove allowed origins
4. **Development Fallback**: Automatic localhost support when ALLOWED_ORIGINS is not set
5. **Header Management**: Proper handling of CSRF tokens and custom headers

## Migration from Old CORS Implementation

The old `corsWithCsrf` function in `csrf-utils.ts` has been marked as deprecated. It still works but logs a deprecation warning. All functions have been migrated to use the new secure implementation.

## Testing

To test CORS configuration:

1. **Valid Origin Test:**
   ```bash
   curl -H "Origin: https://trialcliniq.com" \
        -H "Access-Control-Request-Method: POST" \
        -X OPTIONS \
        https://your-site.netlify.app/.netlify/functions/whoami
   ```

2. **Invalid Origin Test:**
   ```bash
   curl -H "Origin: https://malicious-site.com" \
        -H "Access-Control-Request-Method: POST" \
        -X OPTIONS \
        https://your-site.netlify.app/.netlify/functions/whoami
   ```

The first should return CORS headers, the second should return headers only for the first allowed origin (security fallback).

## Troubleshooting

### CORS errors in browser console

**Error:** "No 'Access-Control-Allow-Origin' header is present"

**Solution:**
1. Check that your frontend's origin is in the `ALLOWED_ORIGINS` list
2. Verify the environment variable is set in Netlify
3. Check browser console for the exact origin being sent
4. Ensure you're using the full protocol (https:// or http://)

### Function works in Postman but not browser

This is likely a CORS issue. Postman doesn't enforce CORS, but browsers do. Make sure your domain is in the allowed origins list.

## Security Notes

- Never commit the `ALLOWED_ORIGINS` value to Git if it contains sensitive staging URLs
- Regularly audit your allowed origins list
- Remove unused origins
- Consider using separate environment variables for different deploy contexts (production vs preview)

## Additional Headers

The CORS utility also handles these headers by default:
- `x-csrf-token` (for CSRF protection)
- `x-user-id` (for authentication)
- `x-patient-id` (for authorization)
- `authorization` (for bearer tokens)

These are configured in the `getCorsHeaders` function in `cors-utils.ts`.
