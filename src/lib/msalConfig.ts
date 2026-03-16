import { Configuration } from '@azure/msal-browser';

const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
const defaultRedirect = origin ? `${origin}/auth-callback` : 'http://localhost:5173/auth-callback';
const defaultLogoutRedirect = origin ? `${origin}/` : 'http://localhost:5173/';

// Use environment variable if set AND it's not the old ngrok URL
// Otherwise use the current window origin for better development experience
const envRedirect = import.meta.env.VITE_AZURE_REDIRECT_URI;
const isOldNgrokUrl = envRedirect && envRedirect.includes('vapourizable-uninterestingly-minerva.ngrok-free.dev');
const redirectUri = (envRedirect && !isOldNgrokUrl) ? envRedirect : defaultRedirect;

// Validate required environment variables
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;

if (!clientId) {
  throw new Error(
    'VITE_AZURE_CLIENT_ID is not set. Please add it to your .env file. ' +
    'Get this value from Azure Portal > Azure Entra ID > App registrations > TrialCliniq'
  );
}

if (!tenantId) {
  throw new Error(
    'VITE_AZURE_TENANT_ID is not set. Please add it to your .env file. ' +
    'Get this value from Azure Portal > Azure Entra ID > Overview > Tenant ID'
  );
}

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: redirectUri,
    postLogoutRedirectUri: import.meta.env.VITE_AZURE_LOGOUT_URI || defaultLogoutRedirect,
    // Keep the SPA on the callback route so our router can handle post-login navigation
    navigateToLoginRequestUrl: false,
  },
  cache: {
    // Local storage avoids session loss on redirect; cookie storage helps Safari
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true,
  },
  system: {
    allowNativeBroker: false,
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (!containsPii) {
          console.debug(`[MSAL] ${message}`);
        }
      },
      piiLoggingEnabled: false,
    },
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'email', 'profile', 'openid'],
};

export const tokenRequest = {
  scopes: ['User.Read', 'email', 'profile', 'openid'],
};

export const silentRequest = {
  ...tokenRequest,
  forceRefresh: false,
};
