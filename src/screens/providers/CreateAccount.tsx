import React, { useState } from "react";
import HomeHeader from "../../components/HomeHeader";
import SignUpForm from "../../components/SignUpForm";
import { signUpUser } from "../../lib/entraId";

export default function CreateAccount(): JSX.Element {
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
        role: "provider",
      }));
      localStorage.setItem("pending_role_v1", "provider");

      // Sign up with Azure Entra ID
      await signUpUser({
        email,
        password: "",
        firstName,
        lastName,
      });
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
        title="Create Clinical Site Account"
        onSubmit={handleSubmit}
        privacyPath="/patients/privacy"
        signInPath="/providers/login"
        error={error}
        isLoading={isLoading}
      />
    </div>
  );
}
