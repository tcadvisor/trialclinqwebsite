import React from "react";
import SiteHeader from "../../components/SiteHeader";
import { Link } from "react-router-dom";
import { getAddedTrials, AddedTrial } from "../../lib/providerTrials";
import { useAuth } from "../../lib/auth";

export default function ProviderDashboard(): JSX.Element {
  const { user } = useAuth();
  const displayName = user ? `${user.firstName} ${user.lastName}` : "";
  const [trials, setTrials] = React.useState<AddedTrial[]>(() => getAddedTrials());
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "provider:trials:v1") setTrials(getAddedTrials());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold">Welcome back, {displayName}</h1>

        <div className="mt-6 grid lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 grid place-items-center text-xl">+</div>
              <div>
                <div className="font-medium">Add or link a trial</div>
                <p className="text-sm text-gray-600 mt-1">Connect an existing trial to your profile or register a new one to start managing participants and matches.</p>
              </div>
            </div>
            <Link to="/providers/trials" className="mt-4 inline-block rounded-full bg-gray-900 px-4 py-2 text-white text-sm hover:bg-black">Add new</Link>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-gray-500">Trials Managed</div>
            <div className="mt-2 text-3xl font-semibold">{trials.length}</div>
            <Link to="/providers/trials" className="mt-3 inline-block text-sm text-blue-600 hover:underline">View</Link>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-gray-500">Upcoming Appointments</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="rounded-lg border p-3">Pre-Screening Call with DG-0109 — 11:30–12:00 — Houston, TX</li>
              <li className="rounded-lg border p-3">Pre-Screening Call with DG-0109 — 11:30–12:00 — Online</li>
            </ul>
            <Link to="/providers/appointments" className="mt-3 w-full inline-block rounded-full border px-4 py-2 text-sm hover:bg-gray-50">View All Appointments</Link>
          </div>
        </div>

        <div className="mt-6 grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-3">Trial Title</th>
                    <th className="px-4 py-3">NCT ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Sponsor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {trials.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-gray-600" colSpan={4}>No trials added yet. Use "Active Clinical Trials" to add from ClinicalTrials.gov.</td>
                    </tr>
                  )}
                  {trials.map((t) => (
                    <tr key={t.nctId}>
                      <td className="px-4 py-3">{t.title}</td>
                      <td className="px-4 py-3 text-gray-600">{t.nctId}</td>
                      <td className="px-4 py-3">{t.status || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{t.sponsor || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4">
              <Link to="/providers/trials/all" className="w-full inline-block text-center rounded-full border px-4 py-2 text-sm hover:bg-gray-50">View All Trials</Link>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm text-gray-500">Newly Matched</div>
            <ul className="mt-2 space-y-2 text-sm">
              {[
                { code: "DR-081", title: "Agorain, New Treatment for Chronic Neuropathy" },
                { code: "AG-002", title: "Investigating Non-Opioid Therapies for Migraine" },
                { code: "MN-290", title: "Agorain, New Treatment for Chronic Neuropathy" },
                { code: "MN-290", title: "Exploring Novel Interventions for Diabetic Peripheral Neuropathy" },
              ].map((r, i) => (
                <li key={`${r.code}-${i}`} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{r.code}</div>
                    <div className="text-gray-600 text-xs">{r.title}</div>
                  </div>
                  <button className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50">View</button>
                </li>
              ))}
            </ul>
            <Link to="/providers/volunteers" className="mt-3 w-full inline-block text-center rounded-full border px-4 py-2 text-sm hover:bg-gray-50">View All Volunteers</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
