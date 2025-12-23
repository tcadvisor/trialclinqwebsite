import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import HomeHeader from "../../components/HomeHeader";
import SignUpForm from "../../components/SignUpForm";
import { signUpUser } from "../../lib/entraId";

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
      password: HTMLInputElement;
      ref?: HTMLInputElement;
    };
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const firstName = form.firstName.value.trim();
    const lastName = form.lastName.value.trim();
    const password = form.password.value;

    try {
      // Sign up with Azure Entra ID
      const result = await signUpUser({
        email,
        password,
        firstName,
        lastName,
      });

      // Sign in user to auth context
      signIn({
        email,
        role: "patient",
        firstName,
        lastName,
        userId: result.userId,
      });

      // Redirect to Azure Entra ID login
      // User will complete authentication there
      navigate("/patients/login");
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
      />
    </div>
  );
}
