import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import HomeHeader from "../../components/HomeHeader";
import SignUpForm from "../../components/SignUpForm";

export default function Volunteer(): JSX.Element {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const form = e.currentTarget as HTMLFormElement & {
      email: HTMLInputElement;
      phone: HTMLInputElement;
      firstName: HTMLInputElement;
      lastName: HTMLInputElement;
      ref?: HTMLInputElement;
    };
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const firstName = form.firstName.value.trim();
    const lastName = form.lastName.value.trim();
    const ref = form.ref?.value?.trim();

    try {
      localStorage.setItem("pending_signup_v1", JSON.stringify({
        email,
        firstName,
        lastName,
        phone,
        ref,
        role: "patient",
      }));
      try {
        localStorage.removeItem("tc_health_profile_v1");
        localStorage.removeItem("tc_health_profile_metadata_v1");
        localStorage.removeItem("tc_docs");
      } catch (_) {}
      navigate("/patients/consent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDemoLogin() {
    const demoUser = {
      email: "demo.patient@example.com",
      firstName: "Demo",
      lastName: "Patient",
      userId: "demo-patient-12345",
      role: "patient" as const,
    };
    signIn(demoUser);
    navigate("/patients/eligible");
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HomeHeader />
      <SignUpForm
        title="Create Patient Account"
        onSubmit={handleSubmit}
        privacyPath="/patients/privacy"
        signInPath="/patients/login"
        error={error}
        isLoading={isLoading}
      />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">For testing purposes:</p>
          <button
            onClick={handleDemoLogin}
            className="inline-block rounded-full bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-2 text-sm font-medium transition"
          >
            Login as Demo Patient
          </button>
        </div>
      </div>
    </div>
  );
}
