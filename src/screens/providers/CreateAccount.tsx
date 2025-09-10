import React from "react";
import { Link } from "react-router-dom";

export default function CreateAccount(): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img alt="TrialCliniq" className="h-8 w-auto" src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png" />
          </Link>
          <Link to="/" className="text-sm text-blue-600 hover:underline">Home</Link>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-2">Create Provider Account</h1>
        <p className="text-gray-600 mb-6">Create your investigator or site admin account to get started.</p>
        <form className="space-y-4">
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
