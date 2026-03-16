import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { setPostLoginRedirect, useAuth } from '../lib/auth';
import { signInUser } from '../lib/simpleAuth';
import { Modal } from './ui/modal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
  role?: 'patient' | 'provider';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'login', role = 'patient' }) => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const triggerButtonRef = useRef<HTMLElement>(null);

  const roleTitle = role === 'provider' ? 'Researcher' : 'Participant';
  const signupPath = role === 'provider' ? '/providers/create' : '/patients/volunteer';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const targetPath = role === 'provider' ? '/providers/dashboard' : '/patients/health-profile';
      const email = loginEmail.trim();
      const password = loginPassword;

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Store role for the auth context to pick up
      localStorage.setItem("pending_role_v1", role);

      const authUser = await signInUser({ email, password });

      if (authUser) {
        // Sign in through context with correct role
        signIn({
          email: authUser.email,
          firstName: authUser.firstName,
          lastName: authUser.lastName,
          role,
          userId: authUser.userId,
        });

        onClose();
        navigate(targetPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = () => {
    onClose();
    navigate(signupPath);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sign In - ${roleTitle}`}
      size="sm"
      closeOnBackdrop={true}
      closeOnEsc={true}
      returnFocusRef={triggerButtonRef}
    >
      <div className="space-y-4 pb-2">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-red-700 text-sm" role="alert">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        <button
          onClick={handleSignup}
          className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          type="button"
        >
          Create {roleTitle} Account
        </button>
      </div>
    </Modal>
  );
};
