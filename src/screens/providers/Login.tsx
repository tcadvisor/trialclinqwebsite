import React from "react";
import { Link } from "react-router-dom";

export default function ProviderLogin(): JSX.Element {
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
        <h1 className="text-3xl font-semibold mb-6">Provider Login</h1>
        <form className="space-y-4">
          <input className="w-full border rounded px-3 py-2" placeholder="Work email" type="email" />
          <input className="w-full border rounded px-3 py-2" placeholder="Password" type="password" />
          <button className="w-full px-4 py-2 rounded bg-gray-900 text-white hover:bg-black" type="submit">Login</button>
        </form>
        <p className="text-sm text-gray-600 mt-4">New to TrialCliniq? <Link to="/providers/create" className="text-blue-600 hover:underline">Create an account</Link></p>
      </main>
    </div>
  );
}
