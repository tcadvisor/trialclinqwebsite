import React from "react";
import { Link, useLocation } from "react-router-dom";
import { getRealMatchedTrialsForCurrentUser, type LiteTrial } from "../../lib/matching";
import PatientHeader from "../../components/PatientHeader";

export default function EligibleTrials(): JSX.Element {
  const [query, setQuery] = React.useState("");
  const [base, setBase] = React.useState<LiteTrial[]>([]);
  const [whyOpen, setWhyOpen] = React.useState(false);
  const [whyContent, setWhyContent] = React.useState<string>("");
  const location = useLocation();
  const offset = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const v = Number(params.get("offset"));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }, [location.search]);
  React.useEffect(() => {
    let cancelled = false;
    const update = async () => {
      const list = await getRealMatchedTrialsForCurrentUser(100);
      if (!cancelled) setBase(list);
    };
    update();
    const handler = () => update();
    window.addEventListener("storage", handler);
    window.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", handler as any);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", handler);
      window.removeEventListener("visibilitychange", handler);
      window.removeEventListener("focus", handler as any);
    };
  }, []);

  const items = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((t) =>
      [t.title, t.nctId, t.phase, t.status, t.location, t.center, ...t.interventions]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query, base]);

  // Simple one-page pagination for now; structure allows future extension
  const page = 1;
  const pageCount = 1;

  const pill = (text: string, color: 'green' | 'violet') => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
        color === 'green'
          ? 'bg-green-100 text-green-700'
          : 'bg-violet-100 text-violet-700'
      }`}
    >
      {text}
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <PatientHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-semibold">Eligible Trials</h1>
          <div className="relative">
            <input
              className="w-64 rounded-full border px-4 py-2 text-sm focus:outline-none"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Trial Title</th>
                <th className="px-4 py-3 font-medium">Trial ID</th>
                <th className="px-4 py-3 font-medium">Trial Status</th>
                <th className="px-4 py-3 font-medium">Trial Phase</th>
                <th className="px-4 py-3 font-medium">Interventions</th>
                <th className="px-4 py-3 font-medium">Compatibility Score</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.slice(offset).map((t) => (
                <tr key={t.slug} className="border-t">
                  <td className="px-4 py-3">
                    <a href={`https://clinicaltrials.gov/study/${encodeURIComponent(t.nctId)}`} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline">
                      {t.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.nctId}</td>
                  <td className="px-4 py-3">
                    {pill(t.status === 'Now Recruiting' ? 'Recruiting' : t.status, 'green')}
                  </td>
                  <td className="px-4 py-3">{pill(t.phase, 'violet')}</td>
                  <td className="px-4 py-3 text-gray-600">{t.interventions.join(' / ')}</td>
                  <td className="px-4 py-3">
                    <span>{t.aiScore}%</span>
                    {(t.aiRationale || t.reason) && (
                      <button
                        type="button"
                        onClick={() => { setWhyContent(`${t.title}\n\n${t.aiRationale || t.reason}`); setWhyOpen(true); }}
                        className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                        aria-label="Why this match"
                      >
                        Why
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`https://clinicaltrials.gov/study/${encodeURIComponent(t.nctId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                    >
                      View on ClinicalTrials.gov
                    </a>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    No trials match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <button className="rounded-lg border px-3 py-1.5 hover:bg-gray-50" disabled>
                Previous
              </button>
              <button className="rounded-lg border px-3 py-1.5 hover:bg-gray-50" disabled>
                Next
              </button>
            </div>
            <div>Page {page} of {pageCount}</div>
          </div>
        </div>
      </main>

      {whyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setWhyOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Why this trial matches you</h3>
              <button className="rounded-md p-1 text-gray-500 hover:bg-gray-100" onClick={() => setWhyOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{whyContent}</div>
          </div>
        </div>
      )}

      <footer className="w-full border-t mt-16">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-6 text-sm text-gray-600 flex items-center justify-between">
          <span>Copyright © 2025 TrialCliniq.</span>
          <span>Terms · Privacy</span>
        </div>
      </footer>
    </div>
  );
}
