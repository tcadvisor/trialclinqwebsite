import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getMsalInstance, getAccessToken } from '../lib/entraId';
import { loginRequest } from '../lib/msalConfig';
import { generatePatientId } from '../lib/patientIdUtils';
import { generateProviderId } from '../lib/providerIdUtils';
import { savePatientProfile, saveProviderProfile } from '../lib/storage';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const pendingRole = (localStorage.getItem('pending_role_v1') as 'patient' | 'provider' | null) || 'patient';
      const pendingSignupRaw = localStorage.getItem('pending_signup_v1');
      const pendingSignup = pendingSignupRaw ? JSON.parse(pendingSignupRaw) : null;
      const dashboardPath = pendingRole === 'provider' ? '/providers/dashboard' : '/patients/dashboard';
      const loginPath = pendingRole === 'provider' ? '/providers/login' : '/patients/login';
      const retryKey = 'msal_redirect_retry_v1';

      const normalizeEmail = (value?: string) => (value || '').trim().toLowerCase();
      const pendingEmail = normalizeEmail(pendingSignup?.email);

      try {
        const msal = getMsalInstance();
        if (!msal) {
          localStorage.removeItem('pending_role_v1');
          navigate(loginPath, { replace: true, state: { authMessage: 'We could not start Microsoft sign-in. Please try again or create an account.' } });
          return;
        }

        const result = await msal.handleRedirectPromise();
        const accounts = msal.getAllAccounts();
        const account = result?.account || accounts[0];

        if (account) {
          msal.setActiveAccount(account);

          // Enforce email match to pending signup data
          const accountEmail = normalizeEmail(account.username);
          if (pendingEmail && accountEmail && pendingEmail !== accountEmail) {
            try {
              msal.setActiveAccount(null);
              await msal.getTokenCache().clear();
            } catch (_) {}
            localStorage.removeItem('pending_role_v1');
            localStorage.removeItem('pending_signup_v1');
            sessionStorage.removeItem(retryKey);
            navigate(loginPath, {
              replace: true,
              state: {
                authMessage: `Please sign in with ${pendingSignup?.email} to finish creating your account.`,
              },
            });
            return;
          }

          const role = pendingRole;

          // Update auth context with user info
          signIn({
            email: account.username,
            firstName: account.name?.split(' ')[0] || '',
            lastName: account.name?.split(' ').slice(1).join(' ') || '',
            role,
            userId: account.localAccountId || account.homeAccountId || '',
          });

          // Best-effort: sync user record in backend so account exists server-side immediately
          try {
            const token = await getAccessToken();
            if (token) {
              await fetch("/.netlify/functions/whoami", {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
              });
            }
          } catch (syncErr) {
            console.warn("whoami sync failed:", syncErr);
          }

          localStorage.removeItem('pending_role_v1');
          localStorage.removeItem('pending_signup_v1');
          sessionStorage.removeItem(retryKey);
          navigate(dashboardPath, { replace: true });
        } else {
          // Retry once with a forced redirect to capture the account
          const hasRetried = sessionStorage.getItem(retryKey) === '1';
          if (!hasRetried) {
            sessionStorage.setItem(retryKey, '1');
            await msal.loginRedirect({ ...loginRequest, prompt: 'select_account' });
            return;
          }

          // No account found after retry: prompt to sign up
          localStorage.removeItem('pending_role_v1');
          localStorage.removeItem('pending_signup_v1');
          sessionStorage.removeItem(retryKey);
          navigate(loginPath, {
            replace: true,
            state: {
              authMessage: pendingSignup
                ? "We couldn't finish creating your TrialCliniq account. Please sign up again or try a different Microsoft login."
                : "We couldn't find a TrialCliniq account for that Microsoft login. Please sign up or try again.",
            },
          });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        localStorage.removeItem('pending_role_v1');
        localStorage.removeItem('pending_signup_v1');
        sessionStorage.removeItem(retryKey);
        navigate(loginPath, {
          replace: true,
          state: {
            authMessage: 'Sign-in was not completed. Please try again or create an account.',
          },
        });
      }
    };

    handleAuthCallback();
  }, [navigate, signIn]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}
