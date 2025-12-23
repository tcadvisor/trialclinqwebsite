/**
 * Azure Entra ID Authentication Module
 * Uses Microsoft Authentication Library (MSAL) for browser
 */

import { PublicClientApplication, AccountInfo, AuthenticationResult, InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalConfig, loginRequest, tokenRequest, silentRequest } from './msalConfig';

let msalInstance: PublicClientApplication;

// Initialize MSAL instance
export function initMsal(): PublicClientApplication {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
}

export function getMsalInstance(): PublicClientApplication {
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
 * Note: Azure Entra ID typically uses existing user accounts.
 * New users should be provisioned via Azure Portal or via MS Graph API.
 */
export async function signUpUser(input: SignUpInput): Promise<{ userId: string; requiresConfirmation: boolean }> {
  try {
    // For new user registration, redirect to sign-up flow
    // This will be handled by Azure Entra ID's sign-up policies
    const msal = getMsalInstance();
    
    // Sign in will trigger sign-up if user doesn't exist and policy is configured
    const result = await msal.loginPopup({
      ...loginRequest,
      prompt: 'select_account', // Forces account selection/creation
    });

    return {
      userId: result.account?.localAccountId || result.account?.homeAccountId || '',
      requiresConfirmation: false, // Azure Entra ID handles confirmation
    };
  } catch (error) {
    throw new Error(`Sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Confirm user MFA (Multi-Factor Authentication)
 * Azure Entra ID handles MFA automatically during sign-in if configured
 */
export async function confirmUserMFA(email: string, mfaCode: string): Promise<void> {
  try {
    // MFA is handled automatically by Azure Entra ID during login flow
    // This function is kept for API compatibility
    console.log('MFA confirmation handled by Azure Entra ID during sign-in');
  } catch (error) {
    throw new Error(`MFA confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Resend MFA code
 * Azure Entra ID handles this automatically
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
 * MFA is handled automatically by Azure Entra ID if enabled
 */
export async function signInUser(input: SignInInput): Promise<AuthUser> {
  try {
    const msal = getMsalInstance();
    
    // Get existing accounts
    const accounts = msal.getAllAccounts();
    let response: AuthenticationResult;

    // If user already has a session, use silent flow first
    if (accounts.length > 0) {
      try {
        response = await msal.acquireTokenSilent({
          ...silentRequest,
          account: accounts[0],
        });
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          // Need interactive login
          response = await msal.loginPopup(loginRequest);
        } else {
          throw error;
        }
      }
    } else {
      // New sign-in with popup
      response = await msal.loginPopup(loginRequest);
    }

    if (!response.account) {
      throw new Error('No account returned from sign-in');
    }

    return {
      email: response.account.username || input.email,
      firstName: response.account.name?.split(' ')[0] || '',
      lastName: response.account.name?.split(' ').slice(1).join(' ') || '',
      role: 'patient', // Default role, can be updated based on Azure AD groups
      userId: response.account.localAccountId || response.account.homeAccountId || '',
    };
  } catch (error) {
    throw new Error(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get current authenticated user from Azure Entra ID
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  try {
    const msal = getMsalInstance();
    const accounts = msal.getAllAccounts();

    if (accounts.length === 0) {
      return null;
    }

    const account = accounts[0];
    return {
      email: account.username,
      firstName: account.name?.split(' ')[0] || '',
      lastName: account.name?.split(' ').slice(1).join(' ') || '',
      role: 'patient', // Default role
      userId: account.localAccountId || account.homeAccountId || '',
    };
  } catch (error) {
    console.error('Failed to get current auth user:', error);
    return null;
  }
}

/**
 * Sign out the current user from Azure Entra ID
 */
export async function signOutUser(): Promise<void> {
  try {
    const msal = getMsalInstance();
    const accounts = msal.getAllAccounts();

    if (accounts.length > 0) {
      await msal.logoutPopup({
        account: accounts[0],
        postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
      });
    }
  } catch (error) {
    throw new Error(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if user is authenticated with Azure Entra ID
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const msal = getMsalInstance();
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
      // Try to get token interactively
      try {
        const response = await msal.acquireTokenPopup(tokenRequest);
        return response.accessToken;
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
 * Refresh the access token
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const msal = getMsalInstance();
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
 * Get user profile information
 */
export async function getUserProfile(): Promise<AuthUser | null> {
  return getCurrentAuthUser();
}
