import { Configuration } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '7f0b1f7e-cf44-42f8-8357-40d87f66475',
    authority: `https://login.microsoftonline.com/${
      import.meta.env.VITE_AZURE_TENANT_ID || 'e7863f3f-5855-4343-8f1d-6f1aa7ba12f3'
    }`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || 'http://localhost:5173/auth-callback',
    postLogoutRedirectUri: import.meta.env.VITE_AZURE_LOGOUT_URI || 'http://localhost:5173/',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
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
