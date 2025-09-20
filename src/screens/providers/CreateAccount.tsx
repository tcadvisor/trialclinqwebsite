import React from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function CreateAccount(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-2">Create Provider Account</h1>
        <p className="text-gray-600 mb-6">Create your investigator or site admin account to get started.</p>
        <form className="space-y-4" onSubmit={(e)=>{e.preventDefault(); navigate("/providers/site-information");}}>
          <input className="w-full border rounded px-3 py-2" placeholder="Full name" />
          <input className="w-full border rounded px-3 py-2" placeholder="Work email" type="email" />
          <input className="w-full border rounded px-3 py-2" placeholder="Organization / Site name" />
          <input className="w-full border rounded px-3 py-2" placeholder="Password" type="password" />
          <button className="w-full px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" type="submit">Create account</button>
        </form>
        <p className="text-sm text-gray-600 mt-4">Already have an account? <Link to="/providers/login" className="text-blue-600 hover:underline">Log in</Link></p>
      </main>
    </div>
  );
}
