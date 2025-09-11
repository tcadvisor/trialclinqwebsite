import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function Volunteer(): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-4">Become a clinical trial volunteer</h1>
        <p className="text-gray-700 mb-6">Create an account to receive personalized trial matches based on your health profile and location.</p>
        <form className="space-y-4">
          <input className="w-full border rounded px-3 py-2" placeholder="Full name" />
          <input className="w-full border rounded px-3 py-2" placeholder="Email" type="email" />
          <input className="w-full border rounded px-3 py-2" placeholder="Location (city, state)" />
          <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" type="submit">Sign up</button>
        </form>
      </main>
    </div>
  );
}
