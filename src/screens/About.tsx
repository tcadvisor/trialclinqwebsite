import React from "react";
import HomeHeader from "../components/HomeHeader";

export default function About(): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HomeHeader />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-semibold mb-4">About TrialClinIQ</h1>
        <p className="text-gray-700 mb-6">
          TrialClinIQ connects patients, caregivers, and research sites with clinical trials that fit
          real-world needs. We focus on privacy-first data exchange and transparent matching so
          people can make informed decisions about participating in research.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border p-6 bg-white">
            <div className="text-sm text-gray-500">Our Mission</div>
            <div className="mt-2 font-semibold">Make trial discovery clear and human</div>
            <p className="mt-2 text-sm text-gray-600">
              We prioritize clarity, consent, and equitable access to study opportunities.
            </p>
          </div>
          <div className="rounded-2xl border p-6 bg-white">
            <div className="text-sm text-gray-500">Our Approach</div>
            <div className="mt-2 font-semibold">Privacy-first matching</div>
            <p className="mt-2 text-sm text-gray-600">
              Patients stay in control of their data while research teams gain qualified, engaged
              participants.
            </p>
          </div>
          <div className="rounded-2xl border p-6 bg-white">
            <div className="text-sm text-gray-500">Our Focus</div>
            <div className="mt-2 font-semibold">CNS trials and beyond</div>
            <p className="mt-2 text-sm text-gray-600">
              We support specialized research areas with high-need communities and complex criteria.
            </p>
          </div>
        </div>

        <section className="mt-10 rounded-2xl border bg-gray-50 p-6">
          <h2 className="text-xl font-semibold mb-2">How we help</h2>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>Match patients to trials using condition and location filters.</li>
            <li>Provide clear eligibility summaries and next-step guidance.</li>
            <li>Help sites engage participants with consent-based workflows.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
