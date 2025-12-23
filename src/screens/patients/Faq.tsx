import React from "react";
import HomeHeader from "../../components/HomeHeader";

export default function Faq(): JSX.Element {
  const faqs = [
    {
      q: "What is a clinical trial?",
      a: "A research study to evaluate medical, surgical, or behavioral interventions. Participation is voluntary.",
    },
    {
      q: "How are matches determined?",
      a: "We consider your condition, location, eligibility criteria, and preferences to suggest relevant trials.",
    },
    {
      q: "Can I leave a trial?",
      a: "Yes. You may withdraw from a study at any time without affecting your regular care.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <HomeHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-6">Frequently Asked Questions</h1>
        <div className="divide-y rounded-2xl border bg-white">
          {faqs.map((f, i) => (
            <details key={i} className="group open:bg-gray-50 px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-medium marker:content-none">
                {f.q}
                <span className="text-gray-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-2 text-gray-600">{f.a}</p>
            </details>
          ))}
        </div>
      </main>
    </div>
  );
}
