import React from "react";
import { Link } from "react-router-dom";

export default function PatientsLogin(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png" alt="TrialCliniq Logo" className="h-8 w-auto" />
          </Link>
        </div>
      </header>
      <main className="px-4 py-12">
        <div className="mx-auto max-w-md bg-white border rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Participant Login</h1>
          <form className="grid gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input type="email" className="w-full rounded-lg border px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Password</label>
              <input type="password" className="w-full rounded-lg border px-3 py-2" required />
            </div>
            <button type="submit" className="rounded-full bg-blue-600 text-white px-6 py-3 hover:bg-blue-700">Login</button>
          </form>
          <div className="text-sm text-gray-600 mt-4">Don't have an account? <Link to="/get-started" className="text-blue-600 underline">Get Started</Link></div>
        </div>
      </main>
    </div>
  );
}
