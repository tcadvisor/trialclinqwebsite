import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeHeader from "../../components/HomeHeader";
import SignUpForm from "../../components/SignUpForm";

export default function Volunteer(): JSX.Element {
  const navigate = useNavigate();
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
    </div>
  );
}
