import { Amplify } from 'aws-amplify';
import { signUp, signIn, signOut, getCurrentUser, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';

const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-2_oGlAdCy5I',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '7jh14mdkunqiub0fv36mhr0s8m',
      region: import.meta.env.VITE_COGNITO_REGION || 'us-east-2',
      identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID,
    }
  }
};

Amplify.configure(cognitoConfig);

export const amplifyConfig = cognitoConfig;

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
 * Sign up a new user
 */
export async function signUpUser(input: SignUpInput): Promise<{ userId: string; requiresConfirmation: boolean }> {
  try {
    const { userId } = await signUp({
      username: input.email,
      password: input.password,
      options: {
        userAttributes: {
          email: input.email,
          given_name: input.firstName,
          family_name: input.lastName,
        }
      }
    });
    return { userId, requiresConfirmation: true };
  } catch (error) {
    throw new Error(`Sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Confirm user email with code
 */
export async function confirmUserSignUp(email: string, code: string): Promise<void> {
  try {
    await confirmSignUp({
      username: email,
      confirmationCode: code,
    });
  } catch (error) {
    throw new Error(`Confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Resend confirmation code
 */
export async function resendConfirmationCode(email: string): Promise<void> {
  try {
    await resendSignUpCode({ username: email });
  } catch (error) {
    throw new Error(`Resend failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sign in user with email and password
 */
export async function signInUser(input: SignInInput): Promise<AuthUser> {
  try {
    const { isSignedIn } = await signIn({
      username: input.email,
      password: input.password,
    });

    if (!isSignedIn) {
      throw new Error('Sign in failed');
    }

    const user = await getCurrentUser();
    const attributes = user.signInDetails?.loginSource === 'USER_PASSWORD_AUTH' ? {} : {};
    
    return {
      email: user.username || input.email,
      firstName: attributes.given_name || '',
      lastName: attributes.family_name || '',
      role: 'patient', // Default role, can be updated based on user attributes
      userId: user.userId || user.username || input.email,
    };
  } catch (error) {
    throw new Error(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  try {
    const user = await getCurrentUser();
    return {
      email: user.username || '',
      firstName: '',
      lastName: '',
      role: 'patient',
      userId: user.userId || user.username || '',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut();
  } catch (error) {
    throw new Error(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if user is authenticated
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}
