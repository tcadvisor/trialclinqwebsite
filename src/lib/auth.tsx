import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentAuthUser, signOutUser } from "./cognito";

export type User = { email: string; role: "patient" | "provider"; firstName: string; lastName: string; userId: string };

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "auth:v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted auth and check Cognito session on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        // First check if there's a valid Cognito session
        const cognitoUser = await getCurrentAuthUser();
        if (cognitoUser) {
          setUser({
            ...cognitoUser,
            userId: cognitoUser.userId || '',
          });
          return;
        }

        // Fall back to localStorage
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { user: Partial<User> | null };
          if (parsed?.user?.email && parsed?.user?.role) {
            const u: User = {
              email: parsed.user.email as string,
              role: parsed.user.role as User["role"],
              firstName: (parsed.user as any).firstName ?? "",
              lastName: (parsed.user as any).lastName ?? "",
              userId: (parsed.user as any).userId ?? "",
            };
            setUser(u);
          }
        }
      } catch (_) {
        // ignore errors, user will need to sign in
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
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
  const signOut = useCallback(async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, isLoading, signIn, signOut, updateUser }),
    [user, signIn, signOut, updateUser, isLoading],
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
