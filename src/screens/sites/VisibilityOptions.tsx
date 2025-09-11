import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function VisibilityOptions(): JSX.Element {
  const options = [
    {
      name: "Featured trial placement",
      detail: "Highlight your listing to eligible patients searching by condition and location.",
    },
    {
      name: "Geo-targeted outreach",
      detail: "Reach nearby patients with IRB-friendly messaging across web, email, and partner networks.",
    },
    {
      name: "Provider referrals",
      detail: "Activate PCP and specialist referrals with simple prescreen flows and consent routing.",
    },
    {
      name: "Insights & attribution",
      detail: "Track conversions from first touch to randomization with privacy-safe analytics.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-2">Visibility/ Marketing Options</h1>
        <p className="text-gray-600 mb-8">Boost your trial listings and site visibility to eligible patients.</p>
        <ul className="grid sm:grid-cols-2 gap-6">
          {options.map((o) => (
            <li key={o.name} className="rounded-2xl border p-6 bg-white">
              <div className="font-semibold">{o.name}</div>
              <div className="text-gray-600 text-sm mt-1">{o.detail}</div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
