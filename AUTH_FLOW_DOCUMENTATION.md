# Azure Entra ID Authentication Flow

## Overview

Both patients and researchers now authenticate through Azure Entra ID with Multi-Factor Authentication (MFA) support. The flow ensures all users go through a secure, centralized authentication system.

## Authentication Routes

### Patient Flow

```
1. User navigates to "Join Waitlist" / "/patients/volunteer"
   ↓
2. User fills signup form (email, password, name, phone)
   ↓
3. Form submits to Volunteer.tsx handleSubmit()
   ↓
4. signUpUser() called from entraId.ts
   ↓
5. User redirected to /patients/login
   ↓
6. User enters credentials on login form
   ↓
7. signInUser() called from entraId.ts
   ↓
8. Azure Entra ID prompts for MFA (if configured)
   ↓
9. Auth token returned to app
   ↓
10. User signed in to auth context
    ↓
11. User redirected to /patients/dashboard
```

### Researcher/Provider Flow

```
1. User navigates to "For Sites: Request Demo" / "/providers/create"
   ↓
2. User fills signup form (email, password, name, phone)
   ↓
3. Form submits to CreateAccount.tsx handleSubmit()
   ↓
4. signUpUser() called from entraId.ts
   ↓
5. User redirected to /providers/login
   ↓
6. User enters credentials on login form
   ↓
7. signInUser() called from entraId.ts
   ↓
8. Azure Entra ID prompts for MFA (if configured)
   ↓
9. Auth token returned to app
   ↓
10. User signed in to auth context with role: "provider"
    ↓
11. User redirected to /providers/dashboard
```

## Updated Files

### Patient Signup/Login
- **`src/screens/patients/Volunteer.tsx`** ✅
  - Now calls `signUpUser()` from `entraId.ts`
  - Redirects to `/patients/login` after signup
  
- **`src/screens/patients/Login.tsx`** ✅
  - Now calls `signInUser()` from `entraId.ts`
  - Shows loading state during authentication
  - Redirects to `/patients/dashboard` on success

### Researcher/Provider Signup/Login
- **`src/screens/providers/CreateAccount.tsx`** ✅
  - Now calls `signUpUser()` from `entraId.ts`
  - Redirects to `/providers/login` after signup
  
- **`src/screens/providers/Login.tsx`** ✅
  - Now calls `signInUser()` from `entraId.ts`
  - Shows loading state during authentication
  - Redirects to `/providers/dashboard` on success

## Authentication Functions

All authentication is handled by these functions in `src/lib/entraId.ts`:

### `signUpUser(input: SignUpInput)`
- Creates a new user account in Azure Entra ID
- Returns userId and confirmation status
- Called during patient/researcher signup

### `signInUser(input: SignInInput)`
- Authenticates user with email and password
- Handles MFA automatically if configured
- Returns authenticated user info
- Called during patient/researcher login

### `getCurrentAuthUser()`
- Retrieves currently authenticated user
- Used by auth context on app load
- Returns user info or null

### `signOutUser()`
- Signs out current user from Azure Entra ID
- Clears tokens and session

### `getAccessToken()`
- Gets access token for API calls
- Automatically refreshes if needed

## Authentication Context

The `src/lib/auth.tsx` auth context manages:
- User state (email, firstName, lastName, role, userId)
- Authentication status
- Sign in/out functions
- Token persistence

```typescript
type User = {
  email: string;
  role: "patient" | "provider";
  firstName: string;
  lastName: string;
  userId: string;
};
```

## MFA (Multi-Factor Authentication)

MFA is handled **automatically** by Azure Entra ID:

1. After user enters email/password
2. Azure Entra ID checks if MFA is required
3. User completes MFA challenge (authenticator app, SMS, security key)
4. Token returned to app
5. **No additional code needed** - it's seamless!

### Configuring MFA

MFA is configured in Azure Portal:
- Navigate to Azure Entra ID → Conditional Access
- Create policy to require MFA for all users
- Or configure per-user MFA in Security defaults

## Error Handling

Both signup and login screens handle errors gracefully:

```typescript
try {
  const user = await signInUser({ email, password });
  signIn(user);
  navigate("/dashboard");
} catch (err) {
  setError("Invalid email or password. Please try again.");
}
```

## Token Management

MSAL (Microsoft Authentication Library) handles:
- ✅ Token acquisition
- ✅ Token refresh before expiry
- ✅ Silent token acquisition
- ✅ Fallback to interactive login if needed
- ✅ Secure token storage (sessionStorage)

## Security Features

✅ **PKCE Flow** - OAuth 2.0 authorization code flow with PKCE  
✅ **Token Refresh** - Automatic token refresh before expiry  
✅ **MFA Support** - Azure Entra ID enforced MFA  
✅ **Session Storage** - Tokens cleared on browser close  
✅ **Role-Based Access** - Patient vs. Provider routes protected  

## Testing the Flow

### Local Testing

1. **Patient Signup**
   ```
   1. Go to http://localhost:5173/
   2. Click "For Patients: Join Waitlist"
   3. Fill signup form
   4. Redirected to patient login
   5. Enter Azure AD credentials (or test account)
   6. Complete MFA if prompted
   7. Signed into patient dashboard
   ```

2. **Provider Signup**
   ```
   1. Go to http://localhost:5173/
   2. Click "For Sites: Request Demo"
   3. Fill signup form
   4. Redirected to provider login
   5. Enter Azure AD credentials
   6. Complete MFA if prompted
   7. Signed into provider dashboard
   ```

## Azure Entra ID Configuration

Required settings in Azure Portal:

1. **App Registration**
   - Name: TrialCliniq
   - Redirect URIs: http://localhost:5173/auth-callback
   - Token configuration: Add claims as needed

2. **Authentication**
   - Implicit grant: Token + ID token
   - Advanced: Allow public client flows

3. **API Permissions**
   - Microsoft Graph: User.Read
   - Any custom APIs needed

4. **Conditional Access (Optional)**
   - Create policy to require MFA
   - Define risk-based policies

## Troubleshooting

### "Sign in failed" Message
- Check credentials are correct
- Verify user exists in Azure Entra ID
- Check MFA is enrolled if required

### Stuck on Loading
- Check browser console for errors
- Verify VITE_AZURE_CLIENT_ID is set
- Check network tab for blocked requests

### MFA Loop
- User needs to enroll MFA method first
- Check Azure AD conditional access policy
- Verify user has permission to authenticate

## Environment Variables

```
VITE_AZURE_CLIENT_ID=7f0b1f7e-cf44-42f8-8357-40d87f66475
VITE_AZURE_TENANT_ID=aef50e46-d8f4-41fc-b1d5-efa2d2f2d5f4
VITE_AZURE_REDIRECT_URI=http://localhost:5173/auth-callback
VITE_AZURE_LOGOUT_URI=http://localhost:5173/
VITE_AZURE_SCOPES=User.Read email profile openid
```

## Next Steps

1. ✅ All signup/login routes updated
2. ✅ Azure Entra ID integration complete
3. ⏳ Test end-to-end flow
4. ⏳ Configure MFA in Azure Portal
5. ⏳ Update production URLs
6. ⏳ Deploy to production

## Support

For issues or questions:
- Check the browser console for error messages
- Review Azure Entra ID logs in Azure Portal
- Refer to MSAL.js documentation
- Contact support with error details
