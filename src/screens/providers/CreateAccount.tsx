import React from "react";
import { useNavigate } from "react-router-dom";
import HomeHeader from "../../components/HomeHeader";
import SignUpForm from "../../components/SignUpForm";
import { upsertAccount } from "../../lib/accountStore";

export default function CreateAccount(): JSX.Element {
  const navigate = useNavigate();

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

    upsertAccount({ email, phone, firstName, lastName, password, ref, role: "provider" });

    navigate("/providers/site-information");
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HomeHeader />
      <SignUpForm
        title="Create Clinical Site Account"
        onSubmit={handleSubmit}
        privacyPath="/patients/privacy"
        signInPath="/providers/login"
      />
    </div>
  );
}
