import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentAuthUser, getMsalInstance, signOutUser } from "./entraId";
import { generatePatientId, clearAllPatientData } from "./patientIdUtils";

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
const PENDING_SIGNUP_KEY = "pending_signup_v1";
const PENDING_ROLE_KEY = "pending_role_v1";
const PROFILE_KEY = "tc_health_profile_v1";
const PROFILE_METADATA_KEY = "tc_health_profile_metadata_v1";
const DOCS_KEY = "tc_docs";
const ELIGIBILITY_KEY = "tc_eligibility_profile";

type PendingSignup = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  ref?: string;
  role?: User["role"];
};

function readPendingSignup(): PendingSignup | null {
  try {
    const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSignup;
  } catch {
    return null;
  }
}

function clearPendingSignup() {
  try {
    localStorage.removeItem(PENDING_SIGNUP_KEY);
    localStorage.removeItem(PENDING_ROLE_KEY);
  } catch (_) {}
}

function readPendingRole(): User["role"] | null {
  try {
    const raw = localStorage.getItem(PENDING_ROLE_KEY);
    if (!raw) return null;
    return raw === "provider" ? "provider" : "patient";
  } catch {
    return null;
  }
}

function clearPendingRole() {
  try {
    localStorage.removeItem(PENDING_ROLE_KEY);
  } catch (_) {}
}

function clearUserScopedDataIfMismatch(currentUser: { email: string; userId: string }) {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as { email?: string; patientId?: string };
    const storedEmail = (parsed?.email || "").trim().toLowerCase();
    const currentEmail = currentUser.email.trim().toLowerCase();
    const storedPatientId = parsed?.patientId || "";
    const expectedPatientId = currentUser.userId; // patientId should match userId (Azure OID)

    // Clear if email OR patientId doesn't match - this ensures proper user isolation
    const emailMismatch = storedEmail && storedEmail !== currentEmail;
    const patientIdMismatch = storedPatientId && storedPatientId !== expectedPatientId;

    if (emailMismatch || patientIdMismatch) {
      console.warn('⚠️ User data mismatch detected - clearing all user-scoped data', {
        emailMatch: !emailMismatch,
        patientIdMatch: !patientIdMismatch,
        storedEmail: storedEmail ? `${storedEmail.substring(0, 3)}***` : 'none',
        currentEmail: currentEmail ? `${currentEmail.substring(0, 3)}***` : 'none',
      });

      // Clear all user-scoped data to prevent data leakage
      clearAllPatientData();
    }
  } catch (error) {
    console.error('Error checking user data mismatch:', error);
    // On error, clear data to be safe
    clearAllPatientData();
  }
}

function mergeProfileFromEligibility(currentEmail: string, currentUser?: { email: string; firstName?: string; lastName?: string; userId?: string }) {
  try {
    const rawProfile = localStorage.getItem(PROFILE_KEY);
    const rawEligibility = localStorage.getItem(ELIGIBILITY_KEY);
    if (!rawEligibility) return;
    const eligibility = JSON.parse(rawEligibility) as any;
    const profile = rawProfile ? (JSON.parse(rawProfile) as any) : null;

    // Generate patient ID from current user info
    const patientId = currentUser ? generatePatientId({
      email: currentUser.email,
      firstName: currentUser.firstName || "",
      lastName: currentUser.lastName || "",
      userId: currentUser.userId || "",
      role: "patient",
    } as any) : ""; // Will be set later if user info is available

    const next = profile || {
      patientId,
      email: currentEmail,
      emailVerified: false,
      age: "",
      weight: "",
      phone: "",
      gender: "",
      race: "",
      language: "",
      bloodGroup: "",
      genotype: "",
      hearingImpaired: false,
      visionImpaired: false,
      primaryCondition: "",
      diagnosed: "",
      allergies: [],
      medications: [],
      additionalInfo: "",
      ecog: "",
      diseaseStage: "",
      biomarkers: "",
      priorTherapies: [],
      comorbidityCardiac: false,
      comorbidityRenal: false,
      comorbidityHepatic: false,
      comorbidityAutoimmune: false,
      infectionHIV: false,
      infectionHBV: false,
      infectionHCV: false,
    };

    if (!next.email) next.email = currentEmail;
    if ((!next.patientId || next.patientId === "") && patientId) next.patientId = patientId;
    if (!next.primaryCondition && eligibility?.condition) next.primaryCondition = String(eligibility.condition);
    if (!next.diagnosed && eligibility?.year) next.diagnosed = String(eligibility.year);
    if ((!Array.isArray(next.medications) || next.medications.length === 0) && Array.isArray(eligibility?.medications)) {
      next.medications = eligibility.medications.map((m: any) => ({ name: String(m) }));
    }

    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch (_) {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted auth and check Cognito session on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const msal = getMsalInstance();
        if (msal) {
          const result = await msal.handleRedirectPromise();
          const account = result?.account;
          if (account) {
            try {
              msal.setActiveAccount(account);
            } catch (_) {}
            const pendingRole = readPendingRole();
            const pending = readPendingSignup();
            const role = pendingRole || pending?.role || "patient";
            const accountFirstName = account.name?.split(" ")[0] || "";
            const accountLastName = account.name?.split(" ").slice(1).join(" ") || "";
            let firstName = accountFirstName;
            let lastName = accountLastName;

            // Block login if signup email doesn't match the Microsoft account used
            const normalizeEmail = (val?: string) => (val || "").trim().toLowerCase();
            const pendingEmail = normalizeEmail(pending?.email);
            const accountEmail = normalizeEmail(account.username);
            if (pendingEmail && accountEmail && pendingEmail !== accountEmail) {
              try {
                msal.setActiveAccount(null);
                await msal.getTokenCache().clear();
              } catch (_) {}
              clearPendingSignup();
              clearPendingRole();
              setIsLoading(false);
              return;
            }

            if (pending) {
              const pendingEmail = (pending.email || "").trim().toLowerCase();
              const accountEmail = (account.username || "").trim().toLowerCase();
              if (!pendingEmail || pendingEmail === accountEmail) {
                firstName = pending.firstName || firstName;
                lastName = pending.lastName || lastName;
                mergeProfileFromEligibility(account.username, {
                  email: account.username,
                  firstName,
                  lastName,
                  userId: account.localAccountId || account.homeAccountId || "",
                });
              }
            }
            clearPendingSignup();
            clearPendingRole();
            const newUser = {
              email: account.username,
              firstName,
              lastName,
              role,
              userId: account.localAccountId || account.homeAccountId || "",
            };
            clearUserScopedDataIfMismatch({ email: newUser.email, userId: newUser.userId });
            setUser(newUser);
            return;
          }
        }

        // First check if there's a valid Cognito session
        const cognitoUser = await getCurrentAuthUser();
        if (cognitoUser) {
          const pendingRole = readPendingRole();
          const pending = readPendingSignup();
          const role = pendingRole || pending?.role || "patient";
          let firstName = cognitoUser.firstName || "";
          let lastName = cognitoUser.lastName || "";
          if (pending) {
            const pendingEmail = (pending.email || "").trim().toLowerCase();
            const accountEmail = (cognitoUser.email || "").trim().toLowerCase();
            if (!pendingEmail || pendingEmail === accountEmail) {
              firstName = pending.firstName || firstName;
              lastName = pending.lastName || lastName;
              mergeProfileFromEligibility(cognitoUser.email, {
                email: cognitoUser.email,
                firstName,
                lastName,
                userId: cognitoUser.userId || "",
              });
            }
            clearPendingSignup();
          }
          clearPendingRole();
          const newUser = {
            ...cognitoUser,
            userId: cognitoUser.userId || '',
            firstName,
            lastName,
            role,
          };
          clearUserScopedDataIfMismatch({ email: newUser.email, userId: newUser.userId });
          setUser(newUser);
          return;
        }

      } catch (_) {
        // ignore errors, user will need to sign in
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  const signIn = useCallback((next: User) => {
    setUser(next);
  }, []);
  const signOut = useCallback(async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Error signing out:', error);
    }

    // Clear all patient-scoped data on sign out for security
    clearAllPatientData();
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
