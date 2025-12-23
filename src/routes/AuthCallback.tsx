import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getMsalInstance } from '../lib/entraId';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const msal = getMsalInstance();
        const accounts = msal.getAllAccounts();

        if (accounts.length > 0) {
          const account = accounts[0];
          
          // Update auth context with user info
          signIn({
            email: account.username,
            firstName: account.name?.split(' ')[0] || '',
            lastName: account.name?.split(' ').slice(1).join(' ') || '',
            role: 'patient', // Default role
            userId: account.localAccountId || account.homeAccountId || '',
          });

          // Redirect to dashboard
          navigate('/app', { replace: true });
        } else {
          // No account found, redirect to home
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/', { replace: true });
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
