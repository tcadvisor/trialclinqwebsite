import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { findAccountByEmail } from "../../lib/accountStore";
import SiteHeader from "../../components/SiteHeader";

export default function Login(): JSX.Element {
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
    const acc = findAccountByEmail(eNorm);
    if (!acc) {
      setError("Account not found. Please sign up.");
      return;
    }
    if (acc.role !== "patient") {
      setError("This email is registered as a researcher. Use Researcher sign in.");
      return;
    }
    if (acc.password !== password) {
      setError("Invalid email or password");
      return;
    }
    signIn({ email: acc.email, role: acc.role, firstName: acc.firstName, lastName: acc.lastName });
    const from = (location.state as any)?.from?.pathname || "/patients/dashboard";
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-6">Participant Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Email"
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
        <p className="text-sm text-gray-600 mt-4">No account? <Link to="/patients/volunteer" className="text-blue-600 hover:underline">Sign up</Link></p>
      </main>
    </div>
  );
}
