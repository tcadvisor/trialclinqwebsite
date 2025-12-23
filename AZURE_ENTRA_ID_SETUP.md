# Azure Entra ID MFA Setup Guide

## Migration Summary

AWS Cognito authentication has been completely removed from the codebase. The app is now prepared for Azure Entra ID (formerly Azure AD) with Multi-Factor Authentication (MFA) support.

## What Was Removed

1. **AWS Amplify** - Removed `aws-amplify` package
2. **Amazon Cognito Identity JS** - Removed `amazon-cognito-identity-js` package
3. **Cognito Configuration** - Removed AWS Cognito user pool settings and configuration
4. **Cognito Auth Functions** - Replaced with Azure Entra ID stubs in `src/lib/entraId.ts`

### Updated Files

- ✅ `src/lib/auth.tsx` - Now imports from `entraId.ts` instead of `cognito.ts`
- ✅ `src/components/AuthModal.tsx` - Removed unused Cognito import
- ✅ `package.json` - Removed AWS dependencies
- ✅ `src/lib/cognito.ts` - Deprecated (can be deleted)
- ✅ `src/lib/entraId.ts` - New Azure Entra ID module (ready for implementation)

## Environment Variables to Remove

Remove these environment variables from your deployment configuration:

```
VITE_COGNITO_USER_POOL_ID
VITE_COGNITO_CLIENT_ID
VITE_COGNITO_REGION
VITE_COGNITO_IDENTITY_POOL_ID
```

## Environment Variables to Add

Add these for Azure Entra ID integration:

```
VITE_AZURE_CLIENT_ID=your-app-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_AZURE_REDIRECT_URI=https://yourapp.com/auth-callback
VITE_AZURE_SCOPES=api://your-scope/.default
```

## Implementation Steps

### Step 1: Install MSAL Library

```bash
npm install @azure/msal-browser @azure/msal-react
```

### Step 2: Configure MSAL

Create `src/lib/msalConfig.ts`:

```typescript
import { Configuration } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => {
        console.log(`[MSAL] ${message}`);
      },
    },
  },
};

export const loginRequest = {
  scopes: (import.meta.env.VITE_AZURE_SCOPES || 'User.Read').split(' '),
};

export const tokenRequest = {
  scopes: (import.meta.env.VITE_AZURE_SCOPES || 'User.Read').split(' '),
};
```

### Step 3: Implement Azure Entra ID Functions

Update `src/lib/entraId.ts` with actual MSAL implementations:

```typescript
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { msalConfig, loginRequest, tokenRequest } from './msalConfig';

const msalInstance = new PublicClientApplication(msalConfig);

export async function signInUser(input: SignInInput): Promise<AuthUser> {
  try {
    const result = await msalInstance.loginPopup(loginRequest);
    
    return {
      email: result.account?.username || input.email,
      firstName: result.account?.name?.split(' ')[0] || '',
      lastName: result.account?.name?.split(' ')[1] || '',
      role: 'patient',
      userId: result.account?.localAccountId || '',
    };
  } catch (error) {
    throw new Error(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;
    
    const account = accounts[0];
    return {
      email: account.username,
      firstName: account.name?.split(' ')[0] || '',
      lastName: account.name?.split(' ')[1] || '',
      role: 'patient',
      userId: account.localAccountId,
    };
  } catch {
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      await msalInstance.logoutPopup({
        account: accounts[0],
      });
    }
  } catch (error) {
    throw new Error(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;

    const response = await msalInstance.acquireTokenSilent({
      ...tokenRequest,
      account: accounts[0],
    });
    
    return response.accessToken;
  } catch (error) {
    console.error('Token acquisition failed:', error);
    return null;
  }
}
```

### Step 4: Update Auth Provider

Update `src/App.tsx` to wrap with MSAL provider:

```typescript
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './lib/msalConfig';

// Wrap your app with MsalProvider
<MsalProvider instance={msalInstance}>
  <YourApp />
</MsalProvider>
```

### Step 5: Configure MFA in Azure Entra ID

1. Sign in to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Entra ID** → **Security** → **Conditional Access**
3. Create a policy to require MFA for sensitive operations
4. Or use **Authentication Methods** → **MFA** for user-based MFA

### Step 6: Update Deployment

Remove AWS environment variables from:
- Netlify environment variables
- GitHub secrets
- CI/CD pipeline variables
- Any other deployment platforms

Add Azure environment variables to your deployment platforms.

## MFA Handling

Azure Entra ID handles MFA automatically during the login flow. When a user has MFA enabled:

1. User signs in with email/password
2. Azure Entra ID prompts for MFA (if configured)
3. User completes MFA challenge
4. Auth token is returned to your app

No additional code is needed - the MSAL library handles the entire flow.

## Testing

```typescript
// Test Azure Entra ID sign-in
import { signInUser, getCurrentAuthUser, signOutUser } from './lib/entraId';

const user = await signInUser({
  email: 'user@example.com',
  password: 'password',
});

const currentUser = await getCurrentAuthUser();
await signOutUser();
```

## Cleanup

You can safely delete `src/lib/cognito.ts` after verifying all imports are updated.

## References

- [MSAL for React](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react)
- [Azure Entra ID Documentation](https://learn.microsoft.com/en-us/azure/active-directory/)
- [Conditional Access and MFA](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-cloud-apps)

## Support

For issues with Azure Entra ID integration:
1. Check the [MSAL.js troubleshooting guide](https://github.com/AzureAD/microsoft-authentication-library-for-js/wiki/Troubleshooting)
2. Verify your app is registered in Azure Entra ID
3. Check that redirect URIs match your deployment environment
4. Verify environment variables are correctly set
