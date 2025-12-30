import React from "react";
import SiteHeader from "../../components/SiteHeader";
import { Link } from "react-router-dom";
import { getAddedTrials, AddedTrial } from "../../lib/providerTrials";
import { getAppointments, Appointment } from "../../lib/providerAppointments";
import { getMatchedVolunteers, MatchedVolunteer } from "../../lib/providerMatches";
import { getTrialInterestedPatients, type InterestedPatient } from "../../lib/trialInterests";
import { useAuth } from "../../lib/auth";

export default function ProviderDashboard(): JSX.Element {
  const { user } = useAuth();
  const displayName = user ? `${user.firstName} ${user.lastName}` : "";
  const userId = user?.userId || "";
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
            <Link to="/providers/trials/all" className="mt-3 inline-block text-sm text-blue-600 hover:underline">View</Link>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-gray-500">Upcoming Appointments</div>
            <ul className="mt-3 space-y-2 text-sm">
              {appointments.length === 0 ? (
                <li className="rounded-lg border p-3 text-gray-600">No upcoming appointments</li>
              ) : (
                appointments.slice(0, 2).map((apt) => (
                  <li key={apt.id} className="rounded-lg border p-3">{apt.title} — {apt.time} — {apt.location}</li>
                ))
              )}
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
            <div className="text-sm text-gray-500">Interested Patients</div>
            {interestedPatientsByTrial.size === 0 ? (
              <div className="mt-4 text-center text-sm text-gray-600 py-6">
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
                        <button className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50">Contact</button>
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
