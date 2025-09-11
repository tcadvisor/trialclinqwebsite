import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function Privacy(): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
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
