import React from "react";
import { Link } from "react-router-dom";

export default function Privacy(): JSX.Element {
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
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-4">Consent & Data Privacy</h1>
        <p className="text-gray-700 mb-6">We take privacy seriously. Your data is encrypted in transit and at rest. We only use your information to provide trial matches and services you consent to. You control what is shared and can revoke consent at any time.</p>
        <h2 className="text-xl font-semibold mb-2">HIPAA & Security</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>HIPAA-aligned administrative, technical, and physical safeguards</li>
          <li>Data minimization and purpose limitation</li>
          <li>Access controls, audit logging, and least-privilege practices</li>
        </ul>
      </main>
    </div>
  );
}
