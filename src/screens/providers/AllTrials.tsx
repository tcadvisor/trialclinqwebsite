import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { getAddedTrials, removeTrial } from "../../lib/providerTrials";
import { useAuth } from "../../lib/auth";

type Trial = {
  title: string;
  id: string; // NCT id
  phase?: string;
  status?: string;
  sponsor?: string;
  sites?: number;
  matched?: number;
  prescreening?: number;
  pass?: number;
};

const TRIALS: Trial[] = [];

export default function AllTrials(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.userId || "";
  const [status, setStatus] = React.useState<string>("All");
  const [phase, setPhase] = React.useState<string>("All");
  const [q, setQ] = React.useState<string>("");
  const [trials, setTrials] = React.useState<Trial[]>(() =>
    userId ? getAddedTrials(userId).map((t) => ({ title: t.title, id: t.nctId, status: t.status, sponsor: t.sponsor })) : []
  );
  const [menuId, setMenuId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === `provider:trials:v1:${userId}`) {
        setTrials(getAddedTrials(userId).map((t) => ({ title: t.title, id: t.nctId, status: t.status, sponsor: t.sponsor })));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  const filtered = React.useMemo(() => {
    return trials.filter((t) =>
      (status === "All" || (t.status || "").toLowerCase() === status.toLowerCase()) &&
      (phase === "All" || (t.phase || "") === phase) &&
      (q.trim() === "" || t.title.toLowerCase().includes(q.trim().toLowerCase()) || t.id.toLowerCase().includes(q.trim().toLowerCase()))
    );
  }, [status, phase, q, trials]);

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
                {["All", "Recruiting", "Completed", "Suspended", "Terminated", "Unknown"].map((s) => (
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
                  <tr key={t.id} className="relative">
                    <td className="px-4 py-3 max-w-[280px] truncate">{t.title}</td>
                    <td className="px-4 py-3 text-gray-600">{t.id}</td>
                    <td className="px-4 py-3">{t.phase || '-'}</td>
                    <td className="px-4 py-3">
                      {(t.status || '').toUpperCase() === 'RECRUITING' ? (
                        <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-xs">Recruiting</span>
                      ) : (
                        <span className="text-gray-700">{t.status || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{t.sites ?? '-'}</td>
                    <td className="px-4 py-3">{t.matched ?? '-'}</td>
                    <td className="px-4 py-3">{t.prescreening ?? '-'}</td>
                    <td className="px-4 py-3">{t.pass ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-block relative">
                        <button
                          className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                          onClick={() => setMenuId((v) => (v === t.id ? null : t.id))}
                          aria-haspopup="menu"
                          aria-expanded={menuId === t.id}
                        >
                          Manage
                        </button>
                        {menuId === t.id && (
                          <div className="absolute right-0 mt-2 w-36 rounded-md border bg-white shadow">
                            <button
                              className="block w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-gray-50"
                              onClick={() => {
                                removeTrial(t.id);
                                setTrials((prev) => prev.filter((x) => x.id !== t.id));
                                setMenuId(null);
                              }}
                            >
                              Delete trial
                            </button>
                          </div>
                        )}
                      </div>
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
