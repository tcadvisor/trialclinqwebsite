/**
 * Simple Username/Password Authentication Module
 * Temporary replacement for Azure MSAL authentication
 *
 * NOTE: This is a simplified auth system for development/testing.
 * For production, consider using a proper backend auth service.
 */

// Storage keys
const USERS_STORAGE_KEY = 'tc_users_v1';
const SESSION_KEY = 'tc_session_v1';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

interface StoredUser {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  userId: string;
  createdAt: number;
}

interface Session {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'provider';
  expiresAt: number;
  token: string;
}

// ============================================================================
// SIMPLE HASHING (for demo purposes - use bcrypt in production)
// ============================================================================

/**
 * Simple hash function for passwords
 * NOTE: In production, use bcrypt or similar on the backend
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'tc_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a simple token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique user ID
 */
function generateUserId(): string {
  return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================================================
// USER STORAGE (localStorage-based for simplicity)
// ============================================================================

function getStoredUsers(): Record<string, StoredUser> {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredUsers(users: Record<string, StoredUser>): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as Session;

    // Check if expired
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Sign up a new user
 */
export async function signUpUser(input: SignUpInput): Promise<{ userId: string; requiresConfirmation: boolean }> {
  const email = input.email.trim().toLowerCase();

  if (!email || !input.password) {
    throw new Error('Email and password are required');
  }

  if (input.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const users = getStoredUsers();

  // Check if user already exists
  if (users[email]) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  // Create new user
  const passwordHash = await hashPassword(input.password);
  const userId = generateUserId();

  const newUser: StoredUser = {
    email,
    passwordHash,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    userId,
    createdAt: Date.now(),
  };

  users[email] = newUser;
  saveStoredUsers(users);

  return {
    userId,
    requiresConfirmation: false,
  };
}

/**
 * Sign in user with email and password
 */
export async function signInUser(input: SignInInput): Promise<AuthUser | null> {
  const email = input.email.trim().toLowerCase();

  if (!email || !input.password) {
    throw new Error('Email and password are required');
  }

  const users = getStoredUsers();
  const user = users[email];

  if (!user) {
    throw new Error('No account found with this email. Please sign up first.');
  }

  // Verify password
  const passwordHash = await hashPassword(input.password);
  if (passwordHash !== user.passwordHash) {
    throw new Error('Incorrect password. Please try again.');
  }

  // Create session - role will be set by the calling code
  const session: Session = {
    userId: user.userId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: 'patient', // Default, will be updated by auth context
    expiresAt: Date.now() + SESSION_EXPIRY_MS,
    token: generateToken(),
  };

  saveSession(session);

  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: 'patient',
    userId: user.userId,
  };
}

/**
 * Get current authenticated user from session
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const session = getSession();

  if (!session) {
    return null;
  }

  return {
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role,
    userId: session.userId,
  };
}

/**
 * Update the current session's role
 */
export function updateSessionRole(role: 'patient' | 'provider'): void {
  const session = getSession();
  if (session) {
    session.role = role;
    saveSession(session);
  }
}

/**
 * Sign out user
 */
export async function signOutUser(): Promise<void> {
  clearSession();
}

/**
 * Check if user is authenticated
 */
export async function isUserAuthenticated(): Promise<boolean> {
  const session = getSession();
  return session !== null;
}

/**
 * Get access token for API calls
 */
export async function getAccessToken(): Promise<string | null> {
  const session = getSession();
  return session?.token || null;
}

/**
 * Refresh access token (extends session)
 */
export async function refreshAccessToken(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;

  // Extend session
  session.expiresAt = Date.now() + SESSION_EXPIRY_MS;
  session.token = generateToken();
  saveSession(session);

  return session.token;
}

/**
 * Get user profile
 */
export async function getUserProfile(): Promise<AuthUser | null> {
  return getCurrentAuthUser();
}

/**
 * Check if email exists (for login form validation)
 */
export function emailExists(email: string): boolean {
  const users = getStoredUsers();
  return !!users[email.trim().toLowerCase()];
}

/**
 * Update user password
 */
export async function updatePassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getStoredUsers();
  const user = users[normalizedEmail];

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const currentHash = await hashPassword(currentPassword);
  if (currentHash !== user.passwordHash) {
    throw new Error('Current password is incorrect');
  }

  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  // Update password
  user.passwordHash = await hashPassword(newPassword);
  users[normalizedEmail] = user;
  saveStoredUsers(users);
}

/**
 * Update user profile info
 */
export async function updateUserInfo(email: string, updates: { firstName?: string; lastName?: string }): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getStoredUsers();
  const user = users[normalizedEmail];

  if (!user) {
    throw new Error('User not found');
  }

  if (updates.firstName) user.firstName = updates.firstName.trim();
  if (updates.lastName) user.lastName = updates.lastName.trim();

  users[normalizedEmail] = user;
  saveStoredUsers(users);

  // Update session too
  const session = getSession();
  if (session && session.email === normalizedEmail) {
    if (updates.firstName) session.firstName = updates.firstName.trim();
    if (updates.lastName) session.lastName = updates.lastName.trim();
    saveSession(session);
  }
}

// Stub functions for compatibility with existing code
export function initMsal(): null { return null; }
export function getMsalInstance(): null { return null; }
export async function confirmUserMFA(_email: string, _mfaCode: string): Promise<void> {}
export async function resendMFACode(_email: string): Promise<void> {}
