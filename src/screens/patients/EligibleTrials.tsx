import React from "react";
import { Link } from "react-router-dom";
import { trials } from "../../lib/trials";

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
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              alt="TrialCliniq"
              className="h-8 w-auto"
              src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/patients/dashboard" className="hover:text-gray-600">Dashboard</Link>
            <Link to="/patients/eligible" className="text-gray-900 border-b-2 border-[#1033e5] pb-1">Eligible Trials</Link>
            <Link to="/patients/health-profile" className="hover:text-gray-600">Health Profile</Link>
            <Link to="/patients/faq" className="hover:text-gray-600">Help Center</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/patients/settings" aria-label="Settings" className="h-9 w-9 grid place-items-center rounded-full border bg-white text-gray-700 hover:bg-gray-50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .69.28 1.35.78 1.82.5.47 1.17.73 1.86.7H21a2 2 0 1 1 0 4h-.09c-.7-.03-1.36.23-1.86.7-.5.47-.78 1.13-.78 1.82Z"/></svg>
            </Link>
            <button className="h-9 px-3 rounded-full border bg-white text-gray-700 hover:bg-gray-50">OB</button>
          </div>
        </div>
      </header>

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
