import React from "react";
import { Link } from "react-router-dom";

export default function PatientsPrivacy(): JSX.Element {
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
          <h1 className="text-4xl font-extrabold text-gray-900">Consent & Data Privacy</h1>
          <p className="mt-4 text-gray-700 leading-relaxed">We take privacy seriously. Your data is encrypted in transit and at rest. We only use your information for matching to clinical trials and never sell personal data. You can revoke consent at any time.</p>
          <ul className="list-disc pl-6 mt-6 space-y-2 text-gray-700">
            <li>HIPAA-aligned data handling</li>
            <li>Granular consent controls</li>
            <li>Access, export, and delete your data anytime</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
