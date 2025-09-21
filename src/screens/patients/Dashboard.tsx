import React from "react";
import { Link } from "react-router-dom";
import { trials } from "../../lib/trials";
import HeaderActions from "../../components/HeaderActions";
import { useAuth } from "../../lib/auth";

export default function Dashboard(): JSX.Element {
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
            <Link to="/patients/eligible" className="hover:text-gray-600">Eligible Trials</Link>
            <Link to="/patients/health-profile" className="hover:text-gray-600">Health Profile</Link>
            <Link to="/patients/faq" className="hover:text-gray-600">Help Center</Link>
          </nav>
          <HeaderActions />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {(() => { const { user } = useAuth(); const name = user ? `${user.firstName} ${user.lastName}` : ""; return (
          <h1 className="text-2xl sm:text-3xl font-semibold">Welcome back, {name}</h1>
        ); })()}

        {/* Top cards */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">Complete your health profile for better trial matches</div>
              <span className="text-xs text-gray-500">95%</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
              <div className="h-2 w-[95%] rounded-full bg-green-500" />
            </div>
            <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 text-white px-3 py-2 text-sm hover:bg-black">
              Complete now
            </button>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm font-medium">Upload New Medical Record</div>
            <p className="mt-2 text-sm text-gray-600">
              You can quickly upload newly acquired medical records to make trial matches more specific
            </p>
            <button className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Upload file
            </button>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-600">Consent Status</div>
                <div className="mt-2 text-lg font-semibold text-green-700">Active</div>
              </div>
              <div className="h-8 w-8 rounded-md bg-green-100" />
            </div>
            <div className="mt-2 text-xs text-gray-500">Last updated: 17 Jun, 2025</div>
          </div>
        </div>

        {/* Trial matches */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Trial Matches</h2>
            <div className="relative">
              <input
                className="w-64 rounded-full border px-4 py-2 text-sm focus:outline-none"
                placeholder="Search"
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Trial Title</th>
                  <th className="px-4 py-3 font-medium">Trial ID</th>
                  <th className="px-4 py-3 font-medium">Trial Status</th>
                  <th className="px-4 py-3 font-medium">Trial Phase</th>
                  <th className="px-4 py-3 font-medium">Compatibility Score</th>
                  <th className="px-4 py-3 font-medium">Interventions</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trials.map((t) => (
                  <tr key={t.slug} className="border-t">
                    <td className="px-4 py-3">
                      <Link to={`/trials/${t.slug}`} className="text-gray-900 hover:underline">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.nctId}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${t.status === 'Now Recruiting' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {t.status === 'Now Recruiting' ? 'Recruiting' : t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700">
                        {t.phase}
                      </span>
                    </td>
                    <td className="px-4 py-3">{t.aiScore}%</td>
                    <td className="px-4 py-3 text-gray-600">{t.interventions.join(' / ')}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50">Contact centre</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link to="/search-results" className="border-t px-4 py-3 block text-sm text-gray-600 hover:bg-gray-50">View All Trials</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
