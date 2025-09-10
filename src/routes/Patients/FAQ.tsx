import React from "react";
import { Link } from "react-router-dom";

export default function PatientsFAQ(): JSX.Element {
  const faqs = [
    { q: "What is a clinical trial?", a: "A research study to evaluate medical, surgical, or behavioral interventions." },
    { q: "Who can participate?", a: "Eligibility depends on the specific study's inclusion and exclusion criteria." },
    { q: "Is there a cost?", a: "Most trials do not charge participants; some reimburse expenses." },
  ];
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
          <h1 className="text-4xl font-extrabold text-gray-900">Frequently Asked Questions</h1>
          <div className="mt-6 divide-y rounded-2xl border overflow-hidden">
            {faqs.map((f, i) => (
              <details key={i} className="group">
                <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between">
                  <span className="font-medium text-gray-900">{f.q}</span>
                  <span className="text-gray-500 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
