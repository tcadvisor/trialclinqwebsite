import React from "react";
import { Link } from "react-router-dom";

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
            <Link to="#" className="hover:text-gray-600">Dashboard</Link>
            <Link to="#" className="hover:text-gray-600">Eligible Trials</Link>
            <Link to="#" className="hover:text-gray-600">Health Profile</Link>
            <Link to="/patients/faq" className="hover:text-gray-600">Help Center</Link>
          </nav>
          <div className="flex items-center gap-3">
            <button className="h-9 px-3 rounded-full border bg-white text-gray-700 hover:bg-gray-50">OB</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-semibold">Welcome back, Olivia</h1>

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
                {[
                  {
                    title: "Agorain, New Treatment for ...",
                    id: "NCT06084521",
                    status: "Recruiting",
                    phase: "Phase II",
                    score: "90%",
                    interventions: "Agorain 50mg / 100mg",
                  },
                  {
                    title: "Investigating Non-Opioid Pain ...",
                    id: "NCT05872145",
                    status: "Recruiting",
                    phase: "Phase I",
                    score: "90%",
                    interventions: "Agorain 50mg / 100mg",
                  },
                  {
                    title: "Exploring Novel Interventions ...",
                    id: "NCT059340...",
                    status: "Recruiting",
                    phase: "Phase IV",
                    score: "90%",
                    interventions: "Agorain 50mg / 100mg",
                  },
                  {
                    title: "A Randomized Study of ...",
                    id: "NCT060459...",
                    status: "Recruiting",
                    phase: "Phase I",
                    score: "90%",
                    interventions: "Agorain 50mg / 100mg",
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-3">{row.title}</td>
                    <td className="px-4 py-3 text-gray-600">{row.id}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700">
                        {row.phase}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.score}</td>
                    <td className="px-4 py-3 text-gray-600">{row.interventions}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50">Contact centre</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t px-4 py-3 text-sm text-gray-600">View All Trials</div>
          </div>
        </section>
      </main>
    </div>
  );
}
