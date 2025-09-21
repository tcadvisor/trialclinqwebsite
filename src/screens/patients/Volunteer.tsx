import React from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import SignUpForm from "../../components/SignUpForm";

export default function Volunteer(): JSX.Element {
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    navigate("/patients/consent");
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
