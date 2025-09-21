import React from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import SignUpForm from "../../components/SignUpForm";

export default function CreateAccount(): JSX.Element {
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    navigate("/providers/site-information");
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader active={undefined} />
      <SignUpForm
        title="Create Clinical Site Account"
        onSubmit={handleSubmit}
        privacyPath="/patients/privacy"
        signInPath="/providers/login"
      />
    </div>
  );
}
