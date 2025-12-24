/**
 * Azure Entra ID Authentication Module
 * Uses Microsoft Authentication Library (MSAL) for browser
 */

import { PublicClientApplication, AccountInfo, AuthenticationResult, InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalConfig, loginRequest, tokenRequest, silentRequest } from './msalConfig';

let msalInstance: PublicClientApplication | null = null;
let initError: string | null = null;

// Initialize MSAL instance with error handling
export function initMsal(): PublicClientApplication | null {
  if (initError) {
    console.error('MSAL initialization failed:', initError);
    return null;
  }

  if (!msalInstance) {
    try {
      // Validate configuration
      if (!msalConfig.auth.clientId) {
        throw new Error('Azure Client ID not configured. Set VITE_AZURE_CLIENT_ID environment variable.');
      }
      if (!msalConfig.auth.authority || msalConfig.auth.authority.includes('undefined')) {
        throw new Error('Azure Tenant ID not configured. Set VITE_AZURE_TENANT_ID environment variable.');
      }

      msalInstance = new PublicClientApplication(msalConfig);
    } catch (error) {
      initError = error instanceof Error ? error.message : 'Failed to initialize MSAL';
      console.error('MSAL initialization error:', initError);
      return null;
    }
  }
  return msalInstance;
}

export function getMsalInstance(): PublicClientApplication | null {
  return msalInstance || initMsal();
}

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthUser {
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'provider';
  userId: string;
}

/**
 * Sign up a new user via Azure Entra ID
 */
export async function signUpUser(input: SignUpInput): Promise<{ userId: string; requiresConfirmation: boolean }> {
  try {
    const msal = getMsalInstance();
    
    if (!msal) {
      throw new Error('Azure Entra ID is not properly configured. Please check your environment variables: VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID');
    }

    // For new user registration, redirect to sign-up flow
    await msal.loginRedirect({
      ...loginRequest,
      prompt: 'select_account',
    });

    return { userId: '', requiresConfirmation: false };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide helpful error messages
    if (errorMsg.includes('not found') || errorMsg.includes('AADSTS90002')) {
      throw new Error('Azure Entra ID tenant is not configured correctly. Please verify your VITE_AZURE_TENANT_ID environment variable.');
    }
    
    throw new Error(`Sign up failed: ${errorMsg}`);
  }
}

/**
 * Confirm user MFA
 */
export async function confirmUserMFA(email: string, mfaCode: string): Promise<void> {
  try {
    console.log('MFA confirmation handled by Azure Entra ID during sign-in');
  } catch (error) {
    throw new Error(`MFA confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Resend MFA code
 */
export async function resendMFACode(email: string): Promise<void> {
  try {
    console.log('MFA code resend handled by Azure Entra ID');
  } catch (error) {
    throw new Error(`MFA resend failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sign in user with email and password
 */
export async function signInUser(input: SignInInput): Promise<AuthUser | null> {
  try {
    const msal = getMsalInstance();
    
    if (!msal) {
      throw new Error('Azure Entra ID is not properly configured. Please check your environment variables: VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID');
    }

    const accounts = msal.getAllAccounts();
    let response: AuthenticationResult;

    if (accounts.length > 0) {
      try {
        response = await msal.acquireTokenSilent({
          ...silentRequest,
          account: accounts[0],
        });
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          await msal.loginRedirect(loginRequest);
          return null;
        } else {
          throw error;
        }
      }
    } else {
      await msal.loginRedirect(loginRequest);
      return null;
    }

    if (!response.account) {
      throw new Error('No account returned from sign-in');
    }

    return {
      email: response.account.username || input.email,
      firstName: response.account.name?.split(' ')[0] || '',
      lastName: response.account.name?.split(' ').slice(1).join(' ') || '',
      role: 'patient',
      userId: response.account.localAccountId || response.account.homeAccountId || '',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide helpful error messages
    if (errorMsg.includes('not found') || errorMsg.includes('AADSTS90002')) {
      throw new Error('Azure Entra ID tenant is not configured correctly. Please verify your VITE_AZURE_TENANT_ID environment variable.');
    }
    
    throw new Error(`Sign in failed: ${errorMsg}`);
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  try {
    const msal = getMsalInstance();
    
    if (!msal) {
      return null;
    }

    const accounts = msal.getAllAccounts();

    if (accounts.length === 0) {
      return null;
    }

    const account = accounts[0];
    return {
      email: account.username,
      firstName: account.name?.split(' ')[0] || '',
      lastName: account.name?.split(' ').slice(1).join(' ') || '',
      role: 'patient',
      userId: account.localAccountId || account.homeAccountId || '',
    };
  } catch (error) {
    console.error('Failed to get current auth user:', error);
    return null;
  }
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  try {
    const msal = getMsalInstance();
    
    if (!msal) {
      return;
    }

    try {
      const accounts = msal.getAllAccounts();
      if (accounts[0]) {
        msal.setActiveAccount(null);
      }
    } catch (_) {}

    try {
      await msal.getTokenCache().clear();
    } catch (_) {}
  } catch (error) {
    throw new Error(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if authenticated
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const msal = getMsalInstance();
    
    if (!msal) {
      return false;
    }

    const accounts = msal.getAllAccounts();
    return accounts.length > 0;
  } catch (error) {
    console.error('Failed to check authentication status:', error);
    return false;
  }
}

/**
 * Get access token for API calls
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const msal = getMsalInstance();
    
    if (!msal) {
      return null;
    }

    const accounts = msal.getAllAccounts();

    if (accounts.length === 0) {
      return null;
    }

    const response = await msal.acquireTokenSilent({
      ...silentRequest,
      account: accounts[0],
    });

    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      console.error('Token acquisition requires interaction');
      try {
        const response = await msal?.acquireTokenPopup(tokenRequest);
        return response?.accessToken || null;
      } catch (interactiveError) {
        console.error('Failed to acquire token interactively:', interactiveError);
        return null;
      }
    } else {
      console.error('Failed to get access token:', error);
      return null;
    }
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const msal = getMsalInstance();
    
    if (!msal) {
      return null;
    }

    const accounts = msal.getAllAccounts();

    if (accounts.length === 0) {
      return null;
    }

    const response = await msal.acquireTokenSilent({
      ...silentRequest,
      account: accounts[0],
      forceRefresh: true,
    });

    return response.accessToken;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(): Promise<AuthUser | null> {
  return getCurrentAuthUser();
}
