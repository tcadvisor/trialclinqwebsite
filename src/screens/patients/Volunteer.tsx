import React from "react";
import { useNavigate, Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function Volunteer(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-4">Become a clinical trial volunteer</h1>
        <p className="text-gray-700 mb-6">Create an account to receive personalized trial matches based on your health profile and location.</p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("/patients/consent");
          }}
        >
          <input className="w-full border rounded px-3 py-2" placeholder="Full name" />
          <input className="w-full border rounded px-3 py-2" placeholder="Email" type="email" />
          <input className="w-full border rounded px-3 py-2" placeholder="Location (city, state)" />
          <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" type="submit">Sign up</button>
        </form>
        <p className="text-sm text-gray-600 mt-4">Already have an account? <Link to="/patients/login" className="text-blue-600 hover:underline">Log in</Link></p>
        <p className="text-sm text-gray-600 mt-2">Are you a researcher? <Link to="/providers/create" className="text-blue-600 hover:underline">Create a clinical site account</Link></p>
      </main>
    </div>
  );
}
