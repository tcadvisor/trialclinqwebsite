import * as React from "react";

export type User = {
  email: string;
  name?: string | null;
};

const STORAGE_KEY = "tc_user";

function parseUser(value: string | null): User | null {
  if (!value) return null;
  try {
    const u = JSON.parse(value);
    if (u && typeof u.email === "string") return u as User;
  } catch {}
  return null;
}

export function getUser(): User | null {
  return parseUser(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
}

export function login(user: User) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  notify();
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  notify();
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

export function useAuthUser(): User | null {
  const [user, setUser] = React.useState<User | null>(() => getUser());

  React.useEffect(() => {
    const onChange = () => setUser(getUser());
    listeners.add(onChange);
    const storageListener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) onChange();
    };
    window.addEventListener("storage", storageListener);
    return () => {
      listeners.delete(onChange);
      window.removeEventListener("storage", storageListener);
    };
  }, []);

  return user;
}
