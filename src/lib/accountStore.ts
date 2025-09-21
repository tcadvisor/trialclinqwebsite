export type Role = "patient" | "provider";

export type Account = {
  email: string;
  password: string;
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
