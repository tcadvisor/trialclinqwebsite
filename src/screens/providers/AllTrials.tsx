import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

type Trial = {
  title: string;
  id: string; // NCT id
  phase: string;
  status: "Recruiting" | "Completed" | "Suspended" | "Terminated" | "Unknown";
  sites: number;
  matched: number;
  prescreening: number;
  pass: number;
};

const TRIALS: Trial[] = [
  {
    title: "Agorain, New Treatment for Chronic Neuropathy",
    id: "NCT06084521",
    phase: "Phase II",
    status: "Recruiting",
    sites: 2,
    matched: 16,
    prescreening: 5,
    pass: 7,
  },
  {
    title: "Investigating Non-Opioid Therapies for Migraine",
    id: "NCT05872145",
    phase: "Phase I",
    status: "Recruiting",
    sites: 2,
    matched: 20,
    prescreening: 5,
    pass: 13,
  },
  {
    title: "Exploring Novel Interventions for Diabetic Peripheral Neuropathy",
    id: "NCT05934022",
    phase: "Phase IV",
    status: "Recruiting",
    sites: 1,
    matched: 5,
    prescreening: 5,
    pass: 11,
  },
  {
    title: "A Randomized Study of Alpha-2 Agonists in Adults",
    id: "NCT06045987",
    phase: "Phase I",
    status: "Recruiting",
    sites: 1,
    matched: 6,
    prescreening: 5,
    pass: 17,
  },
];

export default function AllTrials(): JSX.Element {
  const [status, setStatus] = React.useState<string>("Recruiting");
  const [phase, setPhase] = React.useState<string>("All");
  const [q, setQ] = React.useState<string>("");

  const filtered = React.useMemo(() => {
    return TRIALS.filter((t) =>
      (status === "All" || t.status === (status as Trial["status"])) &&
      (phase === "All" || t.phase === phase) &&
      (q.trim() === "" || t.title.toLowerCase().includes(q.trim().toLowerCase()) || t.id.toLowerCase().includes(q.trim().toLowerCase()))
    );
  }, [status, phase, q]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold">All Trials</h1>

        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-[360px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search trial title"
              className="w-full rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-full border px-3 py-2 text-sm bg-white"
              >
                {(["Recruiting", "Completed", "Suspended", "Terminated", "Unknown", "All"] as const).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Phase:</span>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="rounded-full border px-3 py-2 text-sm bg-white"
              >
                {["All", "Phase I", "Phase II", "Phase III", "Phase IV"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">Trial Title</th>
                  <th className="px-4 py-3">Trial ID</th>
                  <th className="px-4 py-3">Trial Phase</th>
                  <th className="px-4 py-3">Trial Status</th>
                  <th className="px-4 py-3">Sites</th>
                  <th className="px-4 py-3">Matched</th>
                  <th className="px-4 py-3">Pre-screening</th>
                  <th className="px-4 py-3">Pre-screen Pass</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 max-w-[280px] truncate">{t.title}</td>
                    <td className="px-4 py-3 text-gray-600">{t.id}</td>
                    <td className="px-4 py-3">{t.phase}</td>
                    <td className="px-4 py-3">
                      {t.status === "Recruiting" ? (
                        <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-xs">Recruiting</span>
                      ) : (
                        <span className="text-gray-700">{t.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{t.sites}</td>
                    <td className="px-4 py-3">{t.matched}</td>
                    <td className="px-4 py-3">{t.prescreening}</td>
                    <td className="px-4 py-3">{t.pass}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50">Manage</button>
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
