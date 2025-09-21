import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

export type User = { email: string; role: "patient" | "provider"; firstName: string; lastName: string };

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "auth:v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Load persisted auth once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { user: User | null };
        if (parsed?.user?.email && parsed?.user?.role) setUser(parsed.user);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user }));
    } catch (_) {
      // ignore
    }
  }, [user]);

  const signIn = useCallback((next: User) => setUser(next), []);
  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, signIn, signOut }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function RequireAuth({ children, redirectTo = "/patients/login" }: { children: React.ReactNode; redirectTo?: string }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to={redirectTo} replace state={{ from: location }} />;
  return <>{children}</>;
}

export function RequireRole({ children, role, redirectTo }: { children: React.ReactNode; role: User["role"]; redirectTo: string }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isAuthenticated || user?.role !== role) return <Navigate to={redirectTo} replace state={{ from: location }} />;
  return <>{children}</>;
}
