import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import SiteHeader from "../../components/SiteHeader";

export default function ProviderLogin(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signIn, user } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname as string | undefined;
      const fallback = user?.role === "provider" ? "/providers/dashboard" : "/patients/dashboard";
      navigate(from || fallback, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const eNorm = email.trim().toLowerCase();
    if (password !== "test") {
      setError("Invalid email or password");
      return;
    }

    if (eNorm === "chandler_research@test.com") {
      signIn({ email: eNorm, role: "provider" });
      const from = (location.state as any)?.from?.pathname || "/providers/dashboard";
      navigate(from, { replace: true });
      return;
    }

    setError("Please use your researcher account email.");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-6">Provider Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button className="w-full px-4 py-2 rounded bg-gray-900 text-white hover:bg-black" type="submit">Login</button>
        </form>
        <p className="text-sm text-gray-600 mt-4">New to TrialCliniq? <Link to="/providers/create" className="text-blue-600 hover:underline">Create an account</Link></p>
      </main>
    </div>
  );
}
