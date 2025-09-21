import React from "react";
import { Link } from "react-router-dom";
import { trials } from "../../lib/trials";
import PatientHeader from "../../components/PatientHeader";

export default function EligibleTrials(): JSX.Element {
  const [query, setQuery] = React.useState("");

  const items = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = trials
      .slice()
      .sort((a, b) => b.aiScore - a.aiScore);
    if (!q) return base;
    return base.filter((t) =>
      [t.title, t.nctId, t.phase, t.status, t.location, t.center, ...t.interventions]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

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
              {items.map((t) => (
                <tr key={t.slug} className="border-t">
                  <td className="px-4 py-3">
                    <Link to={`/trials/${t.slug}`} className="text-gray-900 hover:underline">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.nctId}</td>
                  <td className="px-4 py-3">
                    {pill(t.status === 'Now Recruiting' ? 'Recruiting' : t.status, 'green')}
                  </td>
                  <td className="px-4 py-3">{pill(t.phase, 'violet')}</td>
                  <td className="px-4 py-3 text-gray-600">{t.interventions.join(' / ')}</td>
                  <td className="px-4 py-3">{t.aiScore}%</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/trials/${t.slug}`}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                    >
                      View
                    </Link>
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

      <footer className="w-full border-t mt-16">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-6 text-sm text-gray-600 flex items-center justify-between">
          <span>Copyright © 2025 TrialCliniq.</span>
          <span>Terms · Privacy</span>
        </div>
      </footer>
    </div>
  );
}
