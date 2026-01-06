import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { consumePostLoginRedirect, setPostLoginRedirect, useAuth } from "../../lib/auth";
import { signInUser } from "../../lib/entraId";
import HomeHeader from "../../components/HomeHeader";

export default function ProviderLogin(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signIn, user } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const authMessage = (location.state as any)?.authMessage as string | undefined;

  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname as string | undefined;
      const fallback = user?.role === "provider" ? "/providers/dashboard" : "/patients/dashboard";
      const target = consumePostLoginRedirect(from || fallback);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const from = (location.state as any)?.from?.pathname || "/providers/dashboard";
      const normalizedEmail = email.trim();
      setPostLoginRedirect(from);

      // Persist email so the callback can enforce matching accounts and prefill Azure login
      localStorage.setItem("pending_signup_v1", JSON.stringify({ email: normalizedEmail, role: "provider" as const }));
      localStorage.setItem("pending_role_v1", "provider");

      // Sign in with Azure Entra ID (redirect flow handled in AuthCallback)
      const authUser = await signInUser({
        email: normalizedEmail,
        password: "",
      });

      if (authUser) {
        // Silent return path (already cached)
        signIn({ ...authUser, role: "provider" });
        const target = consumePostLoginRedirect(from);
        localStorage.removeItem("pending_signup_v1");
        localStorage.removeItem("pending_role_v1");
        navigate(target, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HomeHeader />
      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-6">Provider Login</h1>
        {authMessage && (
          <div className="mb-4 rounded border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
            {authMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            className="w-full px-4 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Redirecting..." : "Continue with Microsoft"}
          </button>
        </form>
        <p className="text-sm text-gray-600 mt-4">New to TrialCliniq? <Link to="/providers/create" className="text-blue-600 hover:underline">Create an account</Link></p>
      </main>
    </div>
  );
}
