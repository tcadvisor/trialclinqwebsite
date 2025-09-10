import React from "react";
import { Link } from "react-router-dom";

export default function PatientsVolunteer(): JSX.Element {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png" alt="TrialCliniq Logo" className="h-8 w-auto" />
          </Link>
        </div>
      </header>
      <main className="px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold text-gray-900">Become a clinical trial volunteer</h1>
          <p className="mt-2 text-gray-600">Create a free account to receive personalized clinical trial matches based on your health profile and location.</p>
          <Link to="/get-started" className="mt-6 inline-block rounded-full bg-blue-600 text-white px-6 py-3 hover:bg-blue-700">Get Started</Link>
        </div>
      </main>
    </div>
  );
}
