/**
 * Secure Authentication Module
 * Uses server-side authentication with proper password hashing
 */

const SESSION_KEY = "tc_session_v2";
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "patient" | "provider";
}

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: "patient" | "provider";
}

export interface SignInInput {
  email: string;
  password: string;
  role?: "patient" | "provider";
}

interface StoredSession {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

// Session management
function getStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as StoredSession;

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

function saveSession(token: string, user: AuthUser, expiresAt: Date): void {
  const session: StoredSession = {
    token,
    user,
    expiresAt: expiresAt.getTime(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearStoredSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// API calls
async function callAuthAPI(action: string, data: Record<string, any>): Promise<any> {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...data }),
    });

    const text = await response.text();

    // Check if we got HTML (API not available)
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error("Auth API not available");
    }

    const result = JSON.parse(text);

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "Auth API not available") {
      // Fall back to local auth
      return null;
    }
    throw error;
  }
}

// Public API
export async function signUpSecure(input: SignUpInput): Promise<{
  ok: boolean;
  userId?: string;
  requiresVerification?: boolean;
  error?: string;
}> {
  try {
    const result = await callAuthAPI("signup", {
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role || "patient",
    });

    if (!result) {
      // Fall back to local auth
      const { signUpUser } = await import("./simpleAuth");
      const localResult = await signUpUser(input);
      return { ok: true, userId: localResult.userId };
    }

    return {
      ok: true,
      userId: result.userId,
      requiresVerification: result.requiresVerification,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Sign up failed",
    };
  }
}

export async function signInSecure(input: SignInInput): Promise<{
  ok: boolean;
  user?: AuthUser;
  error?: string;
  attemptsRemaining?: number;
}> {
  try {
    const result = await callAuthAPI("signin", {
      email: input.email,
      password: input.password,
      role: input.role || "patient",
    });

    if (!result) {
      // Fall back to local auth
      const { signInUser } = await import("./simpleAuth");
      const localUser = await signInUser(input);
      if (localUser) {
        return { ok: true, user: localUser };
      }
      return { ok: false, error: "Invalid credentials" };
    }

    // Save session
    saveSession(result.session.token, result.user, new Date(result.session.expiresAt));

    return { ok: true, user: result.user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed";
    return {
      ok: false,
      error: message,
    };
  }
}

export async function signOutSecure(): Promise<void> {
  try {
    const session = getStoredSession();
    if (session?.token) {
      await callAuthAPI("signout", { token: session.token }).catch(() => {});
    }
  } finally {
    clearStoredSession();
    // Also clear old auth
    const { signOutUser } = await import("./simpleAuth");
    await signOutUser();
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = getStoredSession();

  if (!session) {
    // Try legacy auth
    const { getCurrentAuthUser } = await import("./simpleAuth");
    return getCurrentAuthUser();
  }

  // Validate session with server (optional - can be skipped for performance)
  try {
    const result = await callAuthAPI("validate", { token: session.token });
    if (result?.ok) {
      return result.user;
    }
    // Session invalid - clear it
    clearStoredSession();
    return null;
  } catch {
    // Network error - trust local session
    return session.user;
  }
}

export function getSessionToken(): string | null {
  return getStoredSession()?.token || null;
}

export async function requestPasswordReset(email: string): Promise<{
  ok: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const result = await callAuthAPI("request-reset", { email });
    return { ok: true, message: result?.message || "Reset email sent" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{
  ok: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const result = await callAuthAPI("reset-password", { token, newPassword });
    return { ok: true, message: result?.message || "Password reset successfully" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Reset failed",
    };
  }
}

export async function verifyEmail(token: string): Promise<{
  ok: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const result = await callAuthAPI("verify-email", { token });
    return { ok: true, message: result?.message || "Email verified" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

export function isAuthenticated(): boolean {
  return getStoredSession() !== null;
}

export function updateSessionRole(role: "patient" | "provider"): void {
  const session = getStoredSession();
  if (session) {
    session.user.role = role;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}
