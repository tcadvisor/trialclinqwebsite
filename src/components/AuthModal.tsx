import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { signInUser, signUpUser, confirmUserSignUp } from '../lib/cognito';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
  role?: 'patient' | 'provider';
}

type AuthModalTab = 'login' | 'signup' | 'confirm';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'login', role = 'patient' }) => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AuthModalTab>(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  const roleLabel = role === 'provider' ? 'Researcher/Provider' : 'Patient';
  const roleTitle = role === 'provider' ? 'Researcher' : 'Participant';
  const signupPath = role === 'provider' ? '/providers/create' : '/patients/volunteer';

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Confirmation form state
  const [confirmCode, setConfirmCode] = useState('');

  const resetForm = () => {
    setError('');
    setSuccess('');
    setLoginEmail('');
    setLoginPassword('');
    setConfirmCode('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // For now, create a local user without hitting Cognito
      // This allows testing the auth flow
      signIn({
        email: loginEmail,
        role: role,
        firstName: loginEmail.split('@')[0],
        lastName: '',
        userId: loginEmail,
      });

      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };


  const handleConfirmSuccess = () => {
    setSuccess('Email verified! Please sign in with your credentials.');
    setTimeout(() => {
      resetForm();
      setActiveTab('login');
      setLoginEmail(pendingEmail);
    }, 1500);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await confirmUserSignUp(pendingEmail, confirmCode);
      handleConfirmSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm email');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {activeTab === 'login' && `Sign In - ${roleTitle}`}
            {activeTab === 'signup' && `Create ${roleTitle} Account`}
            {activeTab === 'confirm' && 'Verify Email'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tabs */}
          {activeTab !== 'confirm' && (
            <div className="flex gap-2 mb-6 border-b">
              <button
                onClick={() => {
                  setActiveTab('login');
                  resetForm();
                }}
                className={`pb-2 px-4 font-medium transition-colors ${
                  activeTab === 'login'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate(signupPath);
                }}
                className="pb-2 px-4 font-medium transition-colors text-blue-600 hover:text-blue-700"
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2 text-green-700 text-sm">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Confirmation Form */}
          {activeTab === 'confirm' && (
            <form onSubmit={handleConfirm} className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                We've sent a verification code to <strong>{pendingEmail}</strong>. Please enter it below.
              </p>
              <div>
                <label htmlFor="confirm-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  id="confirm-code"
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || confirmCode.length !== 6}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
