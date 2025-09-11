import React from "react";
import { Link, useNavigate } from "react-router-dom";
import React from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CreateAccount(): JSX.Element {
  const navigate = useNavigate();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [org, setOrg] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { data, error: signErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName, organization: org, role: "provider" } },
      });
      if (signErr) throw signErr;
      const user = data.user;
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email ?? email.trim().toLowerCase(),
          full_name: fullName,
          role: "provider",
        });
      }
      if (!data.session) setMessage("Check your email to verify, then log in.");
      else navigate("/providers/login");
    } catch (err: any) {
      setError(err.message ?? "Account creation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img alt="TrialCliniq" className="h-8 w-auto" src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png" />
          </Link>
          <Link to="/" className="text-sm text-blue-600 hover:underline">Home</Link>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-2">Create Provider Account</h1>
        <p className="text-gray-600 mb-6">Create your investigator or site admin account to get started.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full border rounded px-3 py-2" placeholder="Full name" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="Work email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="Organization / Site name" value={org} onChange={(e)=>setOrg(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          {message && <div className="text-sm text-emerald-700">{message}</div>}
          <button disabled={loading} className="w-full px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" type="submit">{loading? 'Creating...' : 'Create account'}</button>
        </form>
        <p className="text-sm text-gray-600 mt-4">Already have an account? <Link to="/providers/login" className="text-blue-600 hover:underline">Log in</Link></p>
      </main>
    </div>
  );
}
