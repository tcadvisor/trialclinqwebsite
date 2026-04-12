import React from "react";
import SiteHeader from "../../components/SiteHeader";
import { Link } from "react-router-dom";
import { getAddedTrials, getAddedTrialsAsync, AddedTrial } from "../../lib/providerTrials";
import { getAppointments, getAppointmentsAsync, Appointment } from "../../lib/providerAppointments";
import { getMatchedVolunteers, getMatchedVolunteersAsync, MatchedVolunteer } from "../../lib/providerMatches";
import { getTrialInterestedPatients, type InterestedPatient } from "../../lib/trialInterests";
import { useAuth } from "../../lib/auth";
import { BarChart3, Users, Calendar, Plus, ArrowRight, Database, Upload } from "lucide-react";
import { ShimmerCard } from "../../components/ui/shimmer";

export default function ProviderDashboard(): JSX.Element {
  const { user } = useAuth();
  const displayName = user ? `${user.firstName} ${user.lastName}` : "";
  const userId = user?.userId || "";
  const [loading, setLoading] = React.useState(true);
  const [trials, setTrials] = React.useState<AddedTrial[]>(() =>
    userId ? getAddedTrials(userId) : []
  );
  const [appointments, setAppointments] = React.useState<Appointment[]>(() =>
    userId ? getAppointments(userId) : []
  );
  const [matchedVolunteers, setMatchedVolunteers] = React.useState<MatchedVolunteer[]>(() =>
    userId ? getMatchedVolunteers(userId) : []
  );
  const [interestedPatientsByTrial, setInterestedPatientsByTrial] = React.useState<Map<string, InterestedPatient[]>>(new Map());

  React.useEffect(() => {
    if (!userId) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === `provider:trials:v1:${userId}`) {
        setTrials(getAddedTrials(userId));
      } else if (e.key === `provider:appointments:v1:${userId}`) {
        setAppointments(getAppointments(userId));
      } else if (e.key === `provider:matches:v1:${userId}`) {
        setMatchedVolunteers(getMatchedVolunteers(userId));
      }
    };
    window.addEventListener("storage", onStorage);

    // pull fresh data from server so dashboard isn't stale
    Promise.allSettled([
      getAddedTrialsAsync(userId).then(setTrials),
      getAppointmentsAsync(userId).then(setAppointments),
      getMatchedVolunteersAsync(userId).then(setMatchedVolunteers),
    ]).finally(() => setLoading(false));

    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  // Fetch interested patients for managed trials
  React.useEffect(() => {
    if (!userId || trials.length === 0) {
      setInterestedPatientsByTrial(new Map());
      return;
    }

    const fetchInterestedPatients = async () => {
      const map = new Map<string, InterestedPatient[]>();

      for (const trial of trials) {
        try {
          const result = await getTrialInterestedPatients(trial.nctId, userId);
          if (result.ok && result.patients.length > 0) {
            map.set(trial.nctId, result.patients);
          }
        } catch (err) {
          console.error(`Failed to fetch interested patients for ${trial.nctId}:`, err);
        }
      }

      setInterestedPatientsByTrial(map);
    };

    fetchInterestedPatients();
  }, [userId, trials]);
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold">Welcome back, {displayName}</h1>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link
            to="/providers/trials"
            className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-gray-300 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-sm">Add Trial</div>
              <div className="text-xs text-gray-500">Link ClinicalTrials.gov</div>
            </div>
          </Link>

          <Link
            to="/providers/trials/create"
            className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-gray-300 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-sm">Create Trial</div>
              <div className="text-xs text-gray-500">Custom trial</div>
            </div>
          </Link>

          <Link
            to="/providers/team"
            className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-gray-300 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="font-medium text-sm">Team</div>
              <div className="text-xs text-gray-500">Manage members</div>
            </div>
          </Link>

          <Link
            to="/providers/analytics"
            className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-gray-300 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="font-medium text-sm">Analytics</div>
              <div className="text-xs text-gray-500">View reports</div>
            </div>
          </Link>

          <Link
            to="/providers/custom-database"
            className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-gray-300 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Upload className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="font-medium text-sm">Custom Data</div>
              <div className="text-xs text-gray-500">Upload CSV/Excel</div>
            </div>
          </Link>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ShimmerCard /><ShimmerCard /><ShimmerCard /><ShimmerCard />
          </div>
        ) : (
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <div className="rounded-2xl border bg-white p-5 flex flex-col">
            <div className="text-sm text-gray-500">Trials Managed</div>
            <div className="mt-2 text-3xl font-semibold">{trials.length}</div>
            <Link to="/providers/trials/all" className="mt-auto pt-3 inline-block text-sm text-blue-600 hover:underline">View all trials</Link>
          </div>

          <div className="rounded-2xl border bg-white p-5 flex flex-col">
            <div className="text-sm text-gray-500">Pipeline Patients</div>
            <div className="mt-2 text-3xl font-semibold">
              {Array.from(interestedPatientsByTrial.values()).flat().length}
            </div>
            <Link to="/providers/volunteers" className="mt-auto pt-3 inline-block text-sm text-blue-600 hover:underline">View pipeline</Link>
          </div>

          <div className="rounded-2xl border bg-white p-5 flex flex-col">
            <div className="text-sm text-gray-500">Appointments</div>
            <div className="mt-2 text-3xl font-semibold">{appointments.length}</div>
            <Link to="/providers/appointments" className="mt-auto pt-3 inline-block text-sm text-blue-600 hover:underline">View appointments</Link>
          </div>

          <div className="rounded-2xl border bg-white p-5 flex flex-col">
            <div className="text-sm text-gray-500">Interested Patients</div>
            <div className="mt-2 text-3xl font-semibold">{Array.from(interestedPatientsByTrial.values()).flat().length}</div>
            <Link to="/providers/volunteers" className="mt-auto pt-3 inline-block text-sm text-blue-600 hover:underline">View patients</Link>
          </div>
        </div>
        )}

        <div className="mt-6 grid lg:grid-cols-2 gap-4 animate-fade-in">
          <div className="rounded-2xl border bg-white">
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

          <div className="rounded-2xl border bg-white p-4 flex flex-col">
            <div className="text-sm text-gray-500 px-4 py-3 font-medium">Interested Patients</div>
            {interestedPatientsByTrial.size === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-600 py-6">
                No patients have expressed interest yet
              </div>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {Array.from(interestedPatientsByTrial.entries())
                  .flatMap(([nctId, patients]) =>
                    patients.slice(0, 4).map((p) => (
                      <li key={`${p.patientId}-${nctId}`} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <div className="font-medium text-gray-900">{p.email?.split("@")[0] || "Patient"}</div>
                          <div className="text-gray-600 text-xs">{p.primaryCondition || p.gender || "No condition info"}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{nctId}</div>
                        </div>
                        <a
                          href={`mailto:${p.email}`}
                          className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                        >
                          Contact
                        </a>
                      </li>
                    ))
                  )
                  .slice(0, 4)}
              </ul>
            )}
            <Link to="/providers/volunteers" className="mt-3 w-full inline-block text-center rounded-full border px-4 py-2 text-sm hover:bg-gray-50">View All Interested Patients</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
