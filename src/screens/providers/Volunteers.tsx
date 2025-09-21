import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

type Volunteer = {
  id: string;
  condition: string;
  trialTitle: string;
  compatibility: number; // percentage
  status: "Recruiting" | "Completed" | "Suspended" | "Terminated" | "Unknown";
  location: string;
  dateMatched: string; // e.g., June 12, 2025
};

const VOLUNTEERS: Volunteer[] = [
  {
    id: "DR-081",
    condition: "Chronic Pain",
    trialTitle: "Agorain, New Treatment for Chronic Neuropathy",
    compatibility: 92,
    status: "Recruiting",
    location: "Buffalo, NY",
    dateMatched: "June 12, 2025",
  },
  {
    id: "MH-2988",
    condition: "Migraines",
    trialTitle: "Investigating Non-Opioid Therapies for Migraine",
    compatibility: 92,
    status: "Recruiting",
    location: "Niagara Falls, NY",
    dateMatched: "June 12, 2025",
  },
  {
    id: "KLSY298270982",
    condition: "Neuropathic Pain",
    trialTitle: "Exploring Novel Interventions for Diabetic Peripheral Neuropathy",
    compatibility: 94,
    status: "Recruiting",
    location: "Amherst, NY",
    dateMatched: "June 12, 2025",
  },
  {
    id: "DR-411",
    condition: "Neuropathy",
    trialTitle: "A Randomized Study of Alpha-2 Agonists in Adults",
    compatibility: 88,
    status: "Recruiting",
    location: "Niagara Falls, NY",
    dateMatched: "June 12, 2025",
  },
];

export default function Volunteers(): JSX.Element {
  const [activeTab, setActiveTab] = React.useState<"matched" | "prescreen" | "pass" | "fail">("matched");
  const [q, setQ] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState("All");
  const [trialFilter, setTrialFilter] = React.useState("All");

  const trialTitles = React.useMemo(() => ["All", ...Array.from(new Set(VOLUNTEERS.map((v) => v.trialTitle)))], []);

  const filtered = React.useMemo(() => {
    return VOLUNTEERS.filter((v) =>
      (trialFilter === "All" || v.trialTitle === trialFilter) &&
      (q.trim() === "" ||
        v.id.toLowerCase().includes(q.trim().toLowerCase()) ||
        v.trialTitle.toLowerCase().includes(q.trim().toLowerCase()) ||
        v.condition.toLowerCase().includes(q.trim().toLowerCase()))
    );
    // dateFilter not applied in static demo; kept for UI parity
  }, [q, trialFilter, dateFilter]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold">Volunteers</h1>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:w-[420px]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by Patient ID, confidence score, Trial ID, Trial Title"
                className="w-full rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Date:</span>
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded-full border px-3 py-2 text-sm bg-white">
                  {['All', 'Last 7 days', 'Last 30 days', 'This year'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Trial Title:</span>
                <select value={trialFilter} onChange={(e) => setTrialFilter(e.target.value)} className="rounded-full border px-3 py-2 text-sm bg-white">
                  {trialTitles.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <button className="rounded-full border px-4 py-2 text-sm hover:bg-gray-50">Download List</button>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm border-b">
            {[
              { key: "matched", label: "Matched" },
              { key: "prescreen", label: "Pre-screening" },
              { key: "pass", label: "Pre-screen pass" },
              { key: "fail", label: "Pre-screen fail" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`-mb-px border-b-2 px-1.5 py-2 ${activeTab === t.key ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">Volunteer ID</th>
                  <th className="px-4 py-3">Primary Condition</th>
                  <th className="px-4 py-3">Trial Title</th>
                  <th className="px-4 py-3">Compatibility %</th>
                  <th className="px-4 py-3">Trial Status</th>
                  <th className="px-4 py-3">Trial Location</th>
                  <th className="px-4 py-3">Date Matched</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3">{v.id}</td>
                    <td className="px-4 py-3">{v.condition}</td>
                    <td className="px-4 py-3 max-w-[280px] truncate">{v.trialTitle}</td>
                    <td className="px-4 py-3">{v.compatibility}%</td>
                    <td className="px-4 py-3">
                      {v.status === "Recruiting" ? (
                        <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-xs">Recruiting</span>
                      ) : (
                        <span className="text-gray-700">{v.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{v.location}</td>
                    <td className="px-4 py-3">{v.dateMatched}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50">⋯</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <button className="rounded border px-3 py-1 hover:bg-gray-50">Previous</button>
              <button className="rounded border px-3 py-1 hover:bg-gray-50">Next</button>
            </div>
            <div>Page 1 of 1</div>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <Link to="/providers/dashboard" className="hover:underline">Back to dashboard</Link>
        </div>
      </main>

      <footer className="w-full border-t mt-12">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-6 text-xs text-gray-600 flex items-center justify-between">
          <span>Copyright © 2025 TrialCliniq.</span>
          <div className="flex items-center gap-2">
            <Link to="#" className="hover:underline">Terms of Conditions</Link>
            <span>•</span>
            <Link to="#" className="hover:underline">Contact Us</Link>
            <span>•</span>
            <Link to="#" className="hover:underline">Privacy Policy</Link>
          </div>
          <span>Curated by Apperr</span>
        </div>
      </footer>
    </div>
  );
}
