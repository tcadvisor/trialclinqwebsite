/**
 * Simple Username/Password Authentication Module
 *
 * Uses backend API at /api/auth with httpOnly cookies for secure sessions.
 * Falls back to localStorage for offline/development mode.
 */

const AUTH_API = "/api/auth";

// Storage keys (localStorage fallback only)
const USERS_STORAGE_KEY = 'tc_users_v1';
const SESSION_KEY = 'tc_session_v1';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Track if we're using API or localStorage fallback
let useApiAuth = true;

// ============================================================================
// CRITICAL: STRICT MODE - DISABLE LOCALSTORAGE FALLBACK IN PRODUCTION
// ============================================================================
const IS_PRODUCTION = import.meta.env.PROD || import.meta.env.MODE === 'production';
const ALLOW_LOCALSTORAGE_FALLBACK = !IS_PRODUCTION; // Only allow in development

// Development warning flag
let _devAuthWarning: string | null = null;
export function getAuthDevWarning(): string | null { return _devAuthWarning; }

// Check if using real database or localStorage fallback
export function isUsingDatabaseAuth(): boolean { return useApiAuth; }
export function getAuthStorageMethod(): 'database' | 'localStorage' { return useApiAuth ? 'database' : 'localStorage'; }

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
 * PBKDF2-based password hashing with per-user random salt.
 * Only used for local dev fallback -- production uses the server-side auth endpoint.
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  // Generate a random salt per-hash (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  // Store salt:hash so we can verify later
  return `${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored salt:hash string
 */
async function verifyLocalPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHash] = stored.split(':');
  if (!saltHex || !expectedHash) return false;
  const encoder = new TextEncoder();
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === expectedHash;
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
 * Sign up a new user - uses backend API
 */
export async function signUpUser(input: SignUpInput): Promise<{ userId: string; requiresConfirmation: boolean }> {
  const email = input.email.trim().toLowerCase();

  if (!email || !input.password) {
    throw new Error('Email and password are required');
  }

  if (input.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Try backend API first
  try {
    const response = await fetch(AUTH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important for cookies
      body: JSON.stringify({
        action: "signup",
        email,
        password: input.password,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Signup failed");
    }

    useApiAuth = true;
    return {
      userId: data.userId,
      requiresConfirmation: data.requiresVerification || false,
    };
  } catch (err) {
    // CRITICAL: In production, DO NOT fall back to localStorage
    if (!ALLOW_LOCALSTORAGE_FALLBACK) {
      console.error("❌ AUTH ERROR: Backend database unavailable. localStorage fallback DISABLED in production.");
      _devAuthWarning = "CRITICAL: Database connection failed. Auth is NOT working - configure DATABASE_URL!";
      throw new Error('Authentication service unavailable. Please contact support. (Database not configured)');
    }

    // Development only: fall back to localStorage with clear warning
    console.warn("⚠️ DEV MODE: Backend auth failed, using localStorage fallback:", err);
    console.warn("⚠️ WARNING: User data stored in localStorage - NOT SECURE FOR PRODUCTION");
    _devAuthWarning = "⚠️ DEV MODE: Using localStorage fallback - database not connected!";
    useApiAuth = false;

    const users = getStoredUsers();

    if (users[email]) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

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
}

/**
 * Sign in user with email and password - uses backend API with httpOnly cookies
 */
export async function signInUser(input: SignInInput & { role?: 'patient' | 'provider' }): Promise<AuthUser | null> {
  const email = input.email.trim().toLowerCase();

  if (!email || !input.password) {
    throw new Error('Email and password are required');
  }

  // Try backend API first
  try {
    const response = await fetch(AUTH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important: enables httpOnly cookies
      body: JSON.stringify({
        action: "signin",
        email,
        password: input.password,
        role: input.role || "patient",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Sign in failed");
    }

    useApiAuth = true;

    // Store non-sensitive session metadata locally (actual auth is via httpOnly cookie)
    const session: Session = {
      userId: data.user.userId,
      email: data.user.email,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      role: data.user.role || input.role || 'patient',
      expiresAt: new Date(data.session.expiresAt).getTime(),
      token: '', // token is in httpOnly cookie, not exposed to JS
    };
    saveSession(session);

    return {
      email: data.user.email,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      role: data.user.role || input.role || 'patient',
      userId: data.user.userId,
    };
  } catch (err) {
    // CRITICAL: In production, DO NOT fall back to localStorage
    if (!ALLOW_LOCALSTORAGE_FALLBACK) {
      console.error("❌ AUTH ERROR: Backend database unavailable. localStorage fallback DISABLED in production.");
      _devAuthWarning = "CRITICAL: Database connection failed. Auth is NOT working - configure DATABASE_URL!";
      throw new Error('Authentication service unavailable. Please contact support. (Database not configured)');
    }

    // Development only: fall back to localStorage with clear warning
    console.warn("⚠️ DEV MODE: Backend auth failed, using localStorage fallback:", err);
    console.warn("⚠️ WARNING: User data stored in localStorage - NOT SECURE FOR PRODUCTION");
    _devAuthWarning = "⚠️ DEV MODE: Using localStorage fallback - database not connected!";
    useApiAuth = false;

    const users = getStoredUsers();
    const user = users[email];

    if (!user) {
      throw new Error('No account found with this email. Please sign up first.');
    }

    const passwordValid = await verifyLocalPassword(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new Error('Incorrect password. Please try again.');
    }

    const session: Session = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: input.role || 'patient',
      expiresAt: Date.now() + SESSION_EXPIRY_MS,
      token: generateToken(),
    };

    saveSession(session);

    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: input.role || 'patient',
      userId: user.userId,
    };
  }
}

/**
 * Get current authenticated user - validates against backend if available
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  // Try backend validation first (uses httpOnly cookie automatically)
  try {
    const response = await fetch(AUTH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important: sends httpOnly cookie
      body: JSON.stringify({ action: "validate" }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.user) {
        useApiAuth = true;
        // Update localStorage cache
        const session = getSession();
        if (session) {
          session.email = data.user.email;
          session.firstName = data.user.firstName;
          session.lastName = data.user.lastName;
          session.role = data.user.role;
          session.userId = data.user.userId;
          saveSession(session);
        }
        return {
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
          userId: data.user.userId,
        };
      }
    }
  } catch {
    // Backend not available
    if (!ALLOW_LOCALSTORAGE_FALLBACK) {
      console.error("❌ AUTH VALIDATE: Backend unavailable, no localStorage fallback in production");
      return null;
    }
    console.warn("⚠️ DEV MODE: Backend unavailable, checking localStorage session");
  }

  // Fallback to localStorage session (dev mode only effectively)
  const session = getSession();

  if (!session) {
    return null;
  }

  // Flag that we're using localStorage (not secure)
  if (!useApiAuth) {
    _devAuthWarning = "⚠️ DEV MODE: Session from localStorage - NOT from database!";
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
 * Sign out user - clears backend session and localStorage
 */
export async function signOutUser(): Promise<void> {
  // Try backend signout (clears httpOnly cookie)
  try {
    await fetch(AUTH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "signout" }),
    });
  } catch {
    // Ignore errors, still clear local session
  }

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
  const currentValid = await verifyLocalPassword(currentPassword, user.passwordHash);
  if (!currentValid) {
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
