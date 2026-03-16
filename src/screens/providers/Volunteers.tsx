import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { useAuth } from "../../lib/auth";
import { getAddedTrials } from "../../lib/providerTrials";
import { getTrialInterestedPatients, type InterestedPatient } from "../../lib/trialInterests";
import { usePagination } from "../../lib/usePagination";
import { Pagination } from "../../components/ui/pagination";
import {
  getPipelinePatients,
  updatePipelineStatus,
  addToPipeline,
  getStatusLabel,
  getStatusColor,
  type PipelineStatus,
  type PatientPipelineEntry,
} from "../../lib/patientPipeline";
import { ChevronDown, MessageSquare, Calendar, MoreHorizontal, X } from "lucide-react";

type Volunteer = {
  id: string;
  patientId: string;
  email?: string;
  condition: string;
  trialTitle: string;
  trialId: string;
  compatibility: number;
  pipelineStatus: PipelineStatus;
  location?: string;
  dateMatched: string;
  notes?: string;
  contactedAt?: string;
  screenedAt?: string;
  enrolledAt?: string;
};

const PIPELINE_STATUSES: PipelineStatus[] = [
  "interested",
  "contacted",
  "screening",
  "screened",
  "eligible",
  "ineligible",
  "enrolled",
  "active",
  "completed",
  "withdrawn",
];

// Status dropdown component
function StatusDropdown({
  currentStatus,
  onStatusChange,
  disabled,
}: {
  currentStatus: PipelineStatus;
  onStatusChange: (status: PipelineStatus) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(currentStatus)} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"}`}
      >
        {getStatusLabel(currentStatus)}
        {!disabled && <ChevronDown className="h-3 w-3" />}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-40 rounded-lg border bg-white shadow-lg">
          <div className="py-1 max-h-60 overflow-y-auto">
            {PIPELINE_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => {
                  onStatusChange(status);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  status === currentStatus ? "bg-gray-50" : ""
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${getStatusColor(status).split(" ")[0]}`} />
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Notes modal
function NotesModal({
  isOpen,
  onClose,
  volunteer,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  volunteer: Volunteer | null;
  onSave: (notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = React.useState(volunteer?.notes || "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setNotes(volunteer?.notes || "");
  }, [volunteer]);

  if (!isOpen || !volunteer) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(notes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Notes</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="text-sm text-gray-600 mb-2">
            {volunteer.email || volunteer.patientId} - {volunteer.trialId}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this patient..."
            rows={5}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={onClose}
              className="flex-1 border rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm hover:bg-black disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Volunteers(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.userId || "";
  const [volunteers, setVolunteers] = React.useState<Volunteer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [trialFilter, setTrialFilter] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState<string>("All");
  const [selectedVolunteer, setSelectedVolunteer] = React.useState<Volunteer | null>(null);
  const [showNotesModal, setShowNotesModal] = React.useState(false);
  const [statusCounts, setStatusCounts] = React.useState<Record<string, number>>({});

  // Load volunteers and pipeline data
  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadVolunteers = async () => {
      setLoading(true);
      const trials = getAddedTrials(userId);
      const allVolunteers: Volunteer[] = [];

      // Get pipeline data
      const pipelineResult = await getPipelinePatients(userId);
      const pipelineMap = new Map<string, PatientPipelineEntry>();
      if (pipelineResult.ok) {
        setStatusCounts(pipelineResult.statusCounts as Record<string, number>);
        for (const entry of pipelineResult.patients) {
          pipelineMap.set(`${entry.patientId}-${entry.nctId}`, entry);
        }
      }

      for (const trial of trials) {
        try {
          const result = await getTrialInterestedPatients(trial.nctId, userId);
          if (result.ok && result.patients.length > 0) {
            for (const p of result.patients) {
              const pipelineKey = `${p.patientId}-${trial.nctId}`;
              const pipelineEntry = pipelineMap.get(pipelineKey);

              allVolunteers.push({
                id: `${p.patientId}-${trial.nctId}`,
                patientId: p.patientId || `patient-${Date.now()}`,
                email: p.email,
                condition: p.primaryCondition || "Not specified",
                trialTitle: trial.title,
                trialId: trial.nctId,
                compatibility: pipelineEntry?.matchScore || 0,
                pipelineStatus: pipelineEntry?.status || "interested",
                location: p.location,
                dateMatched: p.expressedAt
                  ? new Date(p.expressedAt).toLocaleDateString()
                  : "Unknown",
                notes: pipelineEntry?.notes,
                contactedAt: pipelineEntry?.contactedAt,
                screenedAt: pipelineEntry?.screenedAt,
                enrolledAt: pipelineEntry?.enrolledAt,
              });

              // If not in pipeline, add them
              if (!pipelineEntry && p.patientId) {
                addToPipeline(userId, {
                  patientId: p.patientId,
                  nctId: trial.nctId,
                  status: "interested",
                }).catch(console.error);
              }
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

  const handleStatusChange = async (volunteer: Volunteer, newStatus: PipelineStatus) => {
    const result = await updatePipelineStatus(userId, volunteer.patientId, volunteer.trialId, {
      status: newStatus,
    });

    if (result.ok) {
      setVolunteers((prev) =>
        prev.map((v) =>
          v.id === volunteer.id ? { ...v, pipelineStatus: newStatus } : v
        )
      );
      // Update status counts
      setStatusCounts((prev) => {
        const newCounts = { ...prev };
        if (prev[volunteer.pipelineStatus]) {
          newCounts[volunteer.pipelineStatus] = prev[volunteer.pipelineStatus] - 1;
        }
        newCounts[newStatus] = (prev[newStatus] || 0) + 1;
        return newCounts;
      });
    }
  };

  const handleSaveNotes = async (notes: string) => {
    if (!selectedVolunteer) return;

    const result = await updatePipelineStatus(
      userId,
      selectedVolunteer.patientId,
      selectedVolunteer.trialId,
      { notes }
    );

    if (result.ok) {
      setVolunteers((prev) =>
        prev.map((v) =>
          v.id === selectedVolunteer.id ? { ...v, notes } : v
        )
      );
    }
  };

  const trialTitles = React.useMemo(() => {
    const titles = Array.from(new Set(volunteers.map((v) => v.trialTitle)));
    return ["All", ...titles];
  }, [volunteers]);

  const filtered = React.useMemo(() => {
    return volunteers.filter((v) =>
      (trialFilter === "All" || v.trialTitle === trialFilter) &&
      (statusFilter === "All" || v.pipelineStatus === statusFilter) &&
      (q.trim() === "" ||
        v.patientId.toLowerCase().includes(q.trim().toLowerCase()) ||
        v.trialTitle.toLowerCase().includes(q.trim().toLowerCase()) ||
        v.condition.toLowerCase().includes(q.trim().toLowerCase()) ||
        (v.email || "").toLowerCase().includes(q.trim().toLowerCase()))
    );
  }, [q, trialFilter, statusFilter, volunteers]);

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
        <h1 className="text-2xl font-semibold">Patient Pipeline</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track and manage patients through your recruitment pipeline
        </p>

        {/* Status summary cards */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {["interested", "contacted", "screening", "eligible", "enrolled", "completed"].map(
            (status) => (
              <button
                key={status}
                onClick={() =>
                  setStatusFilter(statusFilter === status ? "All" : status)
                }
                className={`rounded-xl border p-3 text-left transition-all ${
                  statusFilter === status
                    ? "border-gray-900 bg-gray-50"
                    : "bg-white hover:border-gray-300"
                }`}
              >
                <div className="text-xs text-gray-500 capitalize">{status}</div>
                <div className="text-xl font-semibold mt-1">
                  {statusCounts[status] || 0}
                </div>
              </button>
            )
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:w-[420px]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by Patient ID, email, condition, or trial"
                className="w-full rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Trial:</span>
                <select
                  value={trialFilter}
                  onChange={(e) => setTrialFilter(e.target.value)}
                  className="rounded-full border px-3 py-2 text-sm bg-white"
                >
                  {trialTitles.map((t) => (
                    <option key={t} value={t}>
                      {t === "All"
                        ? "All Trials"
                        : t.slice(0, 40) + (t.length > 40 ? "..." : "")}
                    </option>
                  ))}
                </select>
              </label>
              {statusFilter !== "All" && (
                <button
                  onClick={() => setStatusFilter("All")}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3">Trial</th>
                  <th className="px-4 py-3">Match</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        <p>Loading patients...</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <svg
                          className="h-12 w-12 text-gray-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <p className="font-medium">No patients found</p>
                        <p className="text-sm">
                          {statusFilter !== "All"
                            ? `No patients with "${statusFilter}" status`
                            : "When patients express interest, they'll appear here."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  pageItems.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {v.email?.split("@")[0] || v.patientId.slice(0, 12)}
                        </div>
                        {v.email && (
                          <div className="text-xs text-gray-500">{v.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">{v.condition}</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="truncate" title={v.trialTitle}>
                          {v.trialTitle}
                        </div>
                        <div className="text-xs text-gray-500">{v.trialId}</div>
                      </td>
                      <td className="px-4 py-3">
                        {v.compatibility > 0 ? (
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              v.compatibility >= 80
                                ? "bg-emerald-100 text-emerald-700"
                                : v.compatibility >= 60
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {v.compatibility}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusDropdown
                          currentStatus={v.pipelineStatus}
                          onStatusChange={(status) => handleStatusChange(v, status)}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{v.dateMatched}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {v.email && (
                            <a
                              href={`mailto:${v.email}`}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                              title="Send email"
                            >
                              <MessageSquare className="h-4 w-4 text-gray-500" />
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setSelectedVolunteer(v);
                              setShowNotesModal(true);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            title="Add notes"
                          >
                            <MoreHorizontal className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
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
          <Link to="/providers/dashboard" className="hover:underline">
            Back to dashboard
          </Link>
        </div>
      </main>

      <NotesModal
        isOpen={showNotesModal}
        onClose={() => {
          setShowNotesModal(false);
          setSelectedVolunteer(null);
        }}
        volunteer={selectedVolunteer}
        onSave={handleSaveNotes}
      />

      <footer className="w-full border-t mt-12">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-6 text-xs text-gray-600 flex items-center justify-between">
          <span>Copyright © 2025 TrialCliniq.</span>
          <div className="flex items-center gap-2">
            <Link to="/terms" className="hover:underline">
              Terms
            </Link>
            <span>•</span>
            <Link to="/contact" className="hover:underline">
              Contact
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
