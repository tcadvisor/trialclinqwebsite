import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { consumePostLoginRedirect, setPostLoginRedirect, useAuth } from "../../lib/auth";
import { signInUser } from "../../lib/simpleAuth";
import HomeHeader from "../../components/HomeHeader";

export default function Login(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signIn, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const authMessage = (location.state as any)?.authMessage as string | undefined;

  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname as string | undefined;
      const fallback = user?.role === "provider" ? "/providers/dashboard" : "/patients/health-profile";
      const target = consumePostLoginRedirect(from || fallback);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const from = (location.state as any)?.from?.pathname || "/patients/health-profile";
      const normalizedEmail = email.trim();
      setPostLoginRedirect(from);

      // Store pending role
      localStorage.setItem("pending_role_v1", "patient");

      // Sign in with email and password
      const authUser = await signInUser({
        email: normalizedEmail,
        password: password,
      });

      if (authUser) {
        signIn({ ...authUser, role: "patient" });
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

  const handleDemoLogin = () => {
    // Only allow demo login in development mode
    if (!import.meta.env.DEV) {
      setError("Demo login is only available in development mode");
      return;
    }

    const demoUser = {
      email: "demo.patient@example.com",
      firstName: "Demo",
      lastName: "Patient",
      userId: "demo-patient-12345",
      role: "patient" as const,
    };

    // Set up a demo profile so they can see trials
    localStorage.setItem("tc_health_profile_v1", JSON.stringify({
      patientId: "demo-patient-12345",
      email: "demo.patient@example.com",
      emailVerified: true,
      age: "45",
      weight: "75",
      phone: "+1-555-0123",
      gender: "Male",
      race: "Caucasian",
      language: "English",
      bloodGroup: "O",
      genotype: "Unknown",
      hearingImpaired: false,
      visionImpaired: false,
      primaryCondition: "Diabetes",
      diagnosed: "2020",
      allergies: [],
      medications: [{ name: "Metformin", dose: "500mg" }],
      additionalInfo: "Type 2 diabetes management",
      ecog: "0",
      diseaseStage: "Stage 2",
      biomarkers: "HbA1c 7.5%",
      priorTherapies: [],
      comorbidityCardiac: false,
      comorbidityRenal: false,
      comorbidityHepatic: false,
      comorbidityAutoimmune: false,
      infectionHIV: false,
      infectionHBV: false,
      infectionHCV: false,
    }));

    localStorage.setItem("tc_health_profile_metadata_v1", JSON.stringify({
      location: "San Francisco, CA",
      radius: "50 miles",
      lat: 37.7749,
      lng: -122.4194,
    }));

    signIn(demoUser);
    navigate("/patients/health-profile");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HomeHeader />
      <main className="max-w-md mx-auto px-4 py-10 pb-20">
        <h1 className="text-3xl font-semibold mb-6">Participant Login</h1>
        {authMessage && (
          <div className="mb-4 rounded border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
            {authMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email Address</label>
            <input
              id="email"
              className="w-full border rounded px-3 py-2"
              placeholder="Email"
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input
              id="password"
              className="w-full border rounded px-3 py-2"
              placeholder="Password"
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            className="w-full px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-sm text-gray-600 mt-4">No account? <Link to="/patients/volunteer" className="text-blue-600 hover:underline">Sign up</Link></p>

        {import.meta.env.DEV && (
          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-gray-600 mb-3 text-center">For testing purposes:</p>
            <button
              onClick={handleDemoLogin}
              className="w-full inline-block rounded-full bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-2 text-sm font-medium transition"
            >
              Login as Demo Patient
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
