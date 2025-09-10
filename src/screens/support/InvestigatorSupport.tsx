import React from "react";
import { Link } from "react-router-dom";

export default function InvestigatorSupport(): JSX.Element {
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
        <h1 className="text-3xl font-semibold mb-2">TrialCliniq Support Center</h1>
        <p className="text-gray-600 mb-6">Contact support or access onboarding guides for investigators.</p>
        <div className="rounded-2xl border bg-white divide-y">
          <div className="p-6">
            <div className="font-semibold">Getting started</div>
            <p className="text-gray-600 text-sm mt-1">Create your provider account, add a study, invite coordinators, and connect referral channels.</p>
          </div>
          <div className="p-6">
            <div className="font-semibold">Security & privacy</div>
            <p className="text-gray-600 text-sm mt-1">HIPAA-aligned controls, audit logging, consent capture, and data retention policies.</p>
          </div>
          <div className="p-6">
            <div className="font-semibold">Contact support</div>
            <p className="text-gray-600 text-sm mt-1">Email support@trialcliniq.com for help, or book a 30‑minute onboarding session.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
