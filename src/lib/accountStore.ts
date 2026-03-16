/**
 * SECURITY WARNING: This file previously stored passwords in plaintext.
 * Password storage has been REMOVED - passwords should NEVER be stored client-side.
 *
 * Use proper authentication flows with backend services:
 * - Authentication should be handled by the backend
 * - Use secure session tokens or JWT tokens
 * - Never store passwords in localStorage or any client-side storage
 */

export type Role = "patient" | "provider";

export type Account = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  ref?: string;
  role: Role;
};

const ACCOUNTS_KEY = "accounts:v1";

function read(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Account[];
    return [];
  } catch {
    return [];
  }
}

function write(list: Account[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getAccounts(): Account[] {
  return read();
}

export function findAccountByEmail(email: string): Account | undefined {
  const e = email.trim().toLowerCase();
  return read().find((a) => a.email.trim().toLowerCase() === e);
}

/**
 * DEPRECATED: Password verification should be handled by backend authentication
 * This function is kept for backward compatibility but should not be used
 * @deprecated Use backend authentication instead
 */
export function verifyAccount(email: string, password: string): Account | null {
  console.error('verifyAccount is deprecated. Use proper backend authentication.');
  return null;
}

export function upsertAccount(next: Account): void {
  const list = read();
  const e = next.email.trim().toLowerCase();
  const idx = list.findIndex((a) => a.email.trim().toLowerCase() === e);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...next };
  } else {
    list.push(next);
  }
  write(list);
}

/**
 * Remove any legacy password data from localStorage
 * Call this on app initialization to clean up old insecure data
 */
export function removePasswordData(): void {
  const accounts = read();
  const cleaned = accounts.map(acc => {
    const { password, ...rest } = acc as any;
    return rest as Account;
  });
  write(cleaned);
}
