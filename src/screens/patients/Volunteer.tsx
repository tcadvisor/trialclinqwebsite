import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import SiteHeader from "../../components/SiteHeader";
import SignUpForm from "../../components/SignUpForm";
import { upsertAccount } from "../../lib/accountStore";

export default function Volunteer(): JSX.Element {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    const ref = form.ref?.value?.trim();

    upsertAccount({ email, phone, firstName, lastName, password, ref, role: "patient" });
    signIn({ email, role: "patient", firstName, lastName });
    navigate("/patients/signup-personal");
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <SignUpForm
        title="Create Patient Account"
        onSubmit={handleSubmit}
        privacyPath="/patients/privacy"
        signInPath="/patients/login"
      />
    </div>
  );
}
