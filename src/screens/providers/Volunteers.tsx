import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { useAuth } from "../../lib/auth";
import { getAddedTrials } from "../../lib/providerTrials";
import { getTrialInterestedPatients, type InterestedPatient } from "../../lib/trialInterests";
import { usePagination } from "../../lib/usePagination";
import { Pagination } from "../../components/ui/pagination";

type Volunteer = {
  id: string;
  email?: string;
  condition: string;
  trialTitle: string;
  trialId: string;
  compatibility: number;
  status: string;
  location?: string;
  dateMatched: string;
};

export default function Volunteers(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.userId || "";
  const [volunteers, setVolunteers] = React.useState<Volunteer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [trialFilter, setTrialFilter] = React.useState("All");

  // Load interested patients from all trials
  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadVolunteers = async () => {
      setLoading(true);
      const trials = getAddedTrials(userId);
      const allVolunteers: Volunteer[] = [];

      for (const trial of trials) {
        try {
          const result = await getTrialInterestedPatients(trial.nctId, userId);
          if (result.ok && result.patients.length > 0) {
            for (const p of result.patients) {
              allVolunteers.push({
                id: p.patientId || `patient-${Date.now()}`,
                email: p.email,
                condition: p.primaryCondition || "Not specified",
                trialTitle: trial.title,
                trialId: trial.nctId,
                compatibility: p.aiScore || 0,
                status: trial.status || "Unknown",
                location: p.location,
                dateMatched: p.timestamp ? new Date(p.timestamp).toLocaleDateString() : "Unknown",
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch patients for ${trial.nctId}:`, err);
        }
      }

      setVolunteers(allVolunteers);
      setLoading(false);
    };

    loadVolunteers();
  }, [userId]);

  const trialTitles = React.useMemo(() => {
    const titles = Array.from(new Set(volunteers.map((v) => v.trialTitle)));
    return ["All", ...titles];
  }, [volunteers]);

  const filtered = React.useMemo(() => {
    return volunteers.filter((v) =>
      (trialFilter === "All" || v.trialTitle === trialFilter) &&
      (q.trim() === "" ||
        v.id.toLowerCase().includes(q.trim().toLowerCase()) ||
        v.trialTitle.toLowerCase().includes(q.trim().toLowerCase()) ||
        v.condition.toLowerCase().includes(q.trim().toLowerCase()) ||
        (v.email || "").toLowerCase().includes(q.trim().toLowerCase()))
    );
  }, [q, trialFilter, volunteers]);

  const {
    currentPage,
    totalPages,
    pageItems,
    goToPage,
  } = usePagination({
    items: filtered,
    pageSize: 15,
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold">Interested Patients</h1>
        <p className="mt-1 text-sm text-gray-600">Patients who have expressed interest in your trials</p>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:w-[420px]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by Patient ID, condition, or trial"
                className="w-full rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Trial:</span>
                <select value={trialFilter} onChange={(e) => setTrialFilter(e.target.value)} className="rounded-full border px-3 py-2 text-sm bg-white">
                  {trialTitles.map((t) => (
                    <option key={t} value={t}>{t === "All" ? "All Trials" : t.slice(0, 40) + (t.length > 40 ? "..." : "")}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Primary Condition</th>
                  <th className="px-4 py-3">Trial</th>
                  <th className="px-4 py-3">Match Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      Loading interested patients...
                    </td>
                  </tr>
                )}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="font-medium">No interested patients yet</p>
                        <p className="text-sm">When patients express interest in your trials, they'll appear here.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && pageItems.map((v) => (
                  <tr key={`${v.id}-${v.trialId}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{v.email?.split("@")[0] || v.id}</div>
                      {v.email && <div className="text-xs text-gray-500">{v.email}</div>}
                    </td>
                    <td className="px-4 py-3">{v.condition}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="truncate" title={v.trialTitle}>{v.trialTitle}</div>
                      <div className="text-xs text-gray-500">{v.trialId}</div>
                    </td>
                    <td className="px-4 py-3">
                      {v.compatibility > 0 ? (
                        <span className={`rounded-full px-2 py-1 text-xs ${v.compatibility >= 80 ? "bg-emerald-100 text-emerald-700" : v.compatibility >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>
                          {v.compatibility}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {v.status.toUpperCase() === "RECRUITING" ? (
                        <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-xs">Recruiting</span>
                      ) : (
                        <span className="text-gray-700">{v.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{v.dateMatched}</td>
                    <td className="px-4 py-3 text-right">
                      {v.email && (
                        <a
                          href={`mailto:${v.email}`}
                          className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                        >
                          Contact
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <Link to="/providers/dashboard" className="hover:underline">Back to dashboard</Link>
        </div>
      </main>

      <footer className="w-full border-t mt-12">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-6 text-xs text-gray-600 flex items-center justify-between">
          <span>Copyright © 2025 TrialCliniq.</span>
          <div className="flex items-center gap-2">
            <Link to="/terms" className="hover:underline">Terms</Link>
            <span>•</span>
            <Link to="/contact" className="hover:underline">Contact</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:underline">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
