import { Configuration } from '@azure/msal-browser';

const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
const defaultRedirect = origin ? `${origin}/auth-callback` : 'http://localhost:5173/auth-callback';
const defaultLogoutRedirect = origin ? `${origin}/` : 'http://localhost:5173/';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '759d5137-c764-42fb-82c7-40681766c175',
    authority: `https://login.microsoftonline.com/${
      import.meta.env.VITE_AZURE_TENANT_ID || 'e7863f3f-5855-4343-8f1d-6f1aa7ba12f3'
    }`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || defaultRedirect,
    postLogoutRedirectUri: import.meta.env.VITE_AZURE_LOGOUT_URI || defaultLogoutRedirect,
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
