# Azure Entra ID Configuration Fix

## The Problem

The "Get Started" button is not working because the Azure Entra ID tenant ID is invalid:

```
Error: AADSTS90002: Tenant 'aef50e46-d8f4-41fc-b1d5-efa2d2f2d5f4' not found
```

This means the tenant ID from the screenshot is either:
1. Incorrect
2. From a different/deleted Azure subscription
3. Not the actual Directory/Tenant ID

## Solution: Get the Correct Tenant ID

### Step 1: Go to Azure Portal
1. Navigate to [Azure Portal](https://portal.azure.com)
2. Sign in with your Azure account

### Step 2: Find Your Tenant ID
1. Search for "Azure Entra ID" in the search bar (top)
2. Click on **Azure Entra ID** from results
3. In the left sidebar, click **Properties**
4. Look for **Tenant ID** (the blue box at the top right)
5. Copy the entire Tenant ID (should look like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

### Step 3: Verify App Registration
1. In Azure Entra ID, go to **App registrations** in left sidebar
2. Find **TrialCliniq** in the list
3. Copy the **Application (Client) ID**
4. Verify the **Redirect URI** in **Authentication** settings includes:
   - `http://localhost:5173/auth-callback` (for local dev)
   - Your production URL when ready

### Step 4: Update Configuration

**Option A: Via Environment Variables (Recommended)**

Create or update your `.env` file:
```
VITE_AZURE_CLIENT_ID=<your-application-id>
VITE_AZURE_TENANT_ID=<your-correct-tenant-id>
VITE_AZURE_REDIRECT_URI=http://localhost:5173/auth-callback
VITE_AZURE_LOGOUT_URI=http://localhost:5173/
```

Then restart the dev server:
```bash
npm run dev
```

**Option B: Hardcode (Dev Only)**

Edit `src/lib/msalConfig.ts`:
```typescript
export const msalConfig: Configuration = {
  auth: {
    clientId: '<your-application-id>',
    authority: `https://login.microsoftonline.com/<your-correct-tenant-id>`,
    redirectUri: 'http://localhost:5173/auth-callback',
    postLogoutRedirectUri: 'http://localhost:5173/',
  },
  // ... rest of config
};
```

### Step 5: Test

1. Start/restart dev server: `npm run dev`
2. Go to http://localhost:5173/
3. Click "For Patients: Join Waitlist"
4. Fill in the signup form
5. Click "Get Started"
6. Should redirect to Azure Entra ID login page

## Verifying Your Tenant

### Check if Tenant is Correct
1. Go to your Azure Portal
2. Look at the top right corner - you should see your tenant name
3. If you're in the right tenant, you'll see your organization name displayed

### Common Issues

**Issue: Still getting "not found" error**
- Double-check you copied the entire Tenant ID (should be 36 characters including hyphens)
- Make sure you're in the correct Azure subscription
- Try logging out of Azure Portal and logging back in

**Issue: App Registration not found**
- Go to Azure Entra ID → App registrations
- Make sure "All applications" tab is selected (not "Owned applications")
- If TrialCliniq doesn't exist, you need to create it:
  1. Click "New registration"
  2. Name: TrialCliniq
  3. Supported account types: Accounts in this organizational directory only
  4. Redirect URI: Single-page application (SPA) → http://localhost:5173/auth-callback
  5. Click Register

**Issue: Getting popup blocked error**
- Check browser popup blocker
- Allow popups for localhost:5173
- Some browsers require https for production (not needed for local dev)

## What You'll Need

From Azure Portal, collect:
- [x] **Application (Client) ID** (from App registrations → TrialCliniq)
- [ ] **Tenant ID** (from Azure Entra ID → Properties) - **NEED THIS**
- [x] **Redirect URI** (should be http://localhost:5173/auth-callback for dev)

## Testing Checklist

After updating the configuration:
- [ ] Dev server restarted (`npm run dev`)
- [ ] `.env` file updated (if using env vars)
- [ ] No console errors when loading http://localhost:5173/
- [ ] Can click "Get Started" without errors
- [ ] Redirects to Azure Entra ID login page
- [ ] Can sign in with Azure AD credentials
- [ ] Redirected back to app after successful login

## Next Steps

1. **Get the correct Tenant ID from Azure Portal**
2. **Update `.env` file** with correct values
3. **Restart dev server** (`npm run dev`)
4. **Test the signup flow**
5. **Reach out if you see any errors** - provide the exact error message from the browser console

## Getting Help

If you're still having issues:
1. Check browser console (F12 → Console tab) for error messages
2. Look at the Network tab to see which request is failing
3. Share the exact error message from Azure Portal (check Activity logs)
4. Verify you're using the right Azure subscription

---

**TLDR:** Get your real Tenant ID from Azure Entra ID → Properties, update `.env`, restart dev server, then test again.
