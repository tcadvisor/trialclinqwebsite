import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { useAuth } from "../../lib/auth";
import {
  getConnectionStatus,
  initiateConnection,
  completeConnection,
  syncPatients,
  getPatients,
  matchTrialToPatients,
  getTrialMatches,
  updateMatchStatus,
  disconnectElation,
  calculateAge,
  formatPatientName,
  getPrimaryCondition,
  formatMatchScore,
  getStatusColor,
  getStatusLabel,
  type ElationPatientSummary,
  type ElationTrialMatch,
  type ConnectionStatus,
} from "../../lib/elationPatients";
import { getAddedTrials, type AddedTrial } from "../../lib/providerTrials";
import {
  Link2,
  RefreshCw,
  Users,
  Search,
  Filter,
  ChevronDown,
  Mail,
  Check,
  X,
  AlertCircle,
  Database,
  Zap,
} from "lucide-react";

// ============================================================================
// Connection Card
// ============================================================================

function ConnectionCard({
  status,
  onConnect,
  onDisconnect,
  onSync,
  syncing,
}: {
  status: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  syncing: boolean;
}) {
  if (!status.configured && !status.connected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-semibold text-yellow-800">Elation Not Configured</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Elation Health API credentials are not configured. Please contact your administrator to set up
              the ELATION_CLIENT_ID and ELATION_CLIENT_SECRET environment variables.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="bg-white border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Connect to Elation Health</h3>
            <p className="mt-1 text-sm text-gray-600">
              Import your patient panel from Elation to match patients with clinical trials.
              Your patients' data stays secure and HIPAA-compliant.
            </p>
            <button
              onClick={onConnect}
              className="mt-4 flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700"
            >
              <Link2 className="h-4 w-4" />
              Connect Elation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-2xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold">Connected to Elation Health</h3>
            {status.practiceName && (
              <p className="text-sm text-gray-600">{status.practiceName}</p>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>{status.patientCount || 0} patients synced</span>
              {status.lastSync && (
                <span>Last sync: {new Date(status.lastSync).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
          <button
            onClick={onDisconnect}
            className="flex items-center gap-2 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm hover:bg-red-50"
          >
            <X className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Patient List
// ============================================================================

function PatientList({
  patients,
  loading,
  onSelectPatient,
}: {
  patients: ElationPatientSummary[];
  loading: boolean;
  onSelectPatient: (patient: ElationPatientSummary) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No patients synced yet</p>
        <p className="text-sm mt-1">Click "Sync Now" to import patients from Elation</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {patients.map((patient) => (
        <div
          key={patient.id}
          onClick={() => onSelectPatient(patient)}
          className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{formatPatientName(patient)}</div>
              <div className="text-sm text-gray-500">
                {calculateAge(patient.dob)} years • {patient.sex}
                {patient.location && ` • ${patient.location}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                {getPrimaryCondition(patient.problems) || "No conditions"}
              </div>
              <div className="text-xs text-gray-400">
                {patient.problems.filter((p) => p.status === "Active").length} active conditions
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Trial Matcher
// ============================================================================

function TrialMatcher({
  trials,
  userId,
  onMatchComplete,
}: {
  trials: AddedTrial[];
  userId: string;
  onMatchComplete: (nctId: string, count: number) => void;
}) {
  const [selectedTrial, setSelectedTrial] = React.useState<string>("");
  const [matching, setMatching] = React.useState(false);

  const handleMatch = async () => {
    if (!selectedTrial) return;

    const trial = trials.find((t) => t.nctId === selectedTrial);
    if (!trial) return;

    setMatching(true);
    try {
      const result = await matchTrialToPatients(userId, selectedTrial, {
        conditions: trial.conditions,
        // Age and gender would come from trial eligibility criteria
      });

      if (result.ok && result.matchCount !== undefined) {
        onMatchComplete(selectedTrial, result.matchCount);
      }
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="bg-white border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
          <Zap className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold">Match Patients to Trial</h3>
          <p className="text-sm text-gray-600">Find eligible patients from your Elation panel</p>
        </div>
      </div>

      <div className="flex gap-3">
        <select
          value={selectedTrial}
          onChange={(e) => setSelectedTrial(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Select a trial...</option>
          {trials.map((trial) => (
            <option key={trial.nctId} value={trial.nctId}>
              {trial.title} ({trial.nctId})
            </option>
          ))}
        </select>
        <button
          onClick={handleMatch}
          disabled={!selectedTrial || matching}
          className="flex items-center gap-2 bg-purple-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-purple-700 disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {matching ? "Matching..." : "Find Matches"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Match Results
// ============================================================================

function MatchResults({
  nctId,
  matches,
  loading,
  onUpdateStatus,
}: {
  nctId: string;
  matches: ElationTrialMatch[];
  loading: boolean;
  onUpdateStatus: (patientId: number, status: ElationTrialMatch["eligibilityStatus"]) => void;
}) {
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No matches found for this trial</p>
        <p className="text-sm mt-1">Try syncing more patients or adjusting trial criteria</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {matches.map((match) => (
        <div key={match.patientId} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="font-medium">
                  {match.firstName} {match.lastName}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(match.eligibilityStatus)}`}>
                  {getStatusLabel(match.eligibilityStatus)}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Match Score: <span className="font-medium">{formatMatchScore(match.matchScore)}</span>
              </div>
              {match.matchReasons.length > 0 && (
                <button
                  onClick={() => setExpandedId(expandedId === match.patientId ? null : match.patientId)}
                  className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${expandedId === match.patientId ? "rotate-180" : ""}`} />
                  {expandedId === match.patientId ? "Hide" : "Show"} match reasons
                </button>
              )}
              {expandedId === match.patientId && (
                <ul className="mt-2 text-xs text-gray-600 space-y-1 bg-gray-50 rounded-lg p-3">
                  {match.matchReasons.map((reason, idx) => (
                    <li key={idx}>• {reason}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center gap-2">
              {match.eligibilityStatus === "potential" && (
                <>
                  <button
                    onClick={() => onUpdateStatus(match.patientId, "eligible")}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    title="Mark as eligible"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onUpdateStatus(match.patientId, "ineligible")}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Mark as ineligible"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
              {match.eligibilityStatus === "eligible" && match.email && (
                <a
                  href={`mailto:${match.email}?subject=Clinical Trial Opportunity - ${nctId}`}
                  onClick={() => onUpdateStatus(match.patientId, "contacted")}
                  className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-blue-700"
                >
                  <Mail className="h-4 w-4" />
                  Contact
                </a>
              )}
              {match.eligibilityStatus === "contacted" && (
                <button
                  onClick={() => onUpdateStatus(match.patientId, "enrolled")}
                  className="flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" />
                  Mark Enrolled
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ElationPatients(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.userId || "";
  const [searchParams] = useSearchParams();

  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>({ ok: false, connected: false });
  const [patients, setPatients] = React.useState<ElationPatientSummary[]>([]);
  const [trials, setTrials] = React.useState<AddedTrial[]>([]);
  const [matches, setMatches] = React.useState<ElationTrialMatch[]>([]);
  const [selectedTrialForMatches, setSelectedTrialForMatches] = React.useState<string>("");

  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [loadingMatches, setLoadingMatches] = React.useState(false);

  const [conditionFilter, setConditionFilter] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"patients" | "matches">("patients");

  // Handle OAuth callback
  React.useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state && userId) {
      completeConnection(userId, code, state).then((result) => {
        if (result.ok) {
          // Clear URL params
          window.history.replaceState({}, "", "/providers/elation");
          // Refresh status
          loadData();
        }
      });
    }
  }, [searchParams, userId]);

  // Load initial data
  const loadData = React.useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [statusResult, trialsData] = await Promise.all([
        getConnectionStatus(userId),
        Promise.resolve(getAddedTrials(userId)),
      ]);

      setConnectionStatus(statusResult);
      setTrials(trialsData);

      if (statusResult.connected) {
        const patientsResult = await getPatients(userId, { limit: 50 });
        if (patientsResult.ok && patientsResult.patients) {
          setPatients(patientsResult.patients);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleConnect = async () => {
    const result = await initiateConnection(userId);
    if (result.ok && result.authUrl) {
      window.location.href = result.authUrl;
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect from Elation? This will remove all synced patient data.")) return;

    const result = await disconnectElation(userId);
    if (result.ok) {
      setConnectionStatus({ ok: true, connected: false });
      setPatients([]);
      setMatches([]);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPatients(userId, {
        limit: 100,
        problemFilter: conditionFilter || undefined,
      });

      if (result.ok) {
        const patientsResult = await getPatients(userId, { limit: 50 });
        if (patientsResult.ok && patientsResult.patients) {
          setPatients(patientsResult.patients);
        }
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleMatchComplete = async (nctId: string, count: number) => {
    setSelectedTrialForMatches(nctId);
    setActiveTab("matches");

    // Load matches
    setLoadingMatches(true);
    try {
      const result = await getTrialMatches(userId, nctId);
      if (result.ok && result.matches) {
        setMatches(result.matches);
      }
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleUpdateStatus = async (patientId: number, status: ElationTrialMatch["eligibilityStatus"]) => {
    if (!selectedTrialForMatches) return;

    await updateMatchStatus(userId, patientId, selectedTrialForMatches, status);

    // Update local state
    setMatches((prev) =>
      prev.map((m) => (m.patientId === patientId ? { ...m, eligibilityStatus: status } : m))
    );
  };

  const handleSelectPatient = (patient: ElationPatientSummary) => {
    // Could open a detail modal or navigate to patient detail
    console.log("Selected patient:", patient);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <SiteHeader />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Elation Patient Import</h1>
            <p className="mt-1 text-sm text-gray-600">
              Import patients from Elation Health and match them to your clinical trials
            </p>
          </div>
        </div>

        {/* Connection Card */}
        <ConnectionCard
          status={connectionStatus}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onSync={handleSync}
          syncing={syncing}
        />

        {connectionStatus.connected && (
          <>
            {/* Trial Matcher */}
            <div className="mt-6">
              <TrialMatcher trials={trials} userId={userId} onMatchComplete={handleMatchComplete} />
            </div>

            {/* Tabs */}
            <div className="mt-6 border-b">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("patients")}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 ${
                    activeTab === "patients"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Users className="h-4 w-4 inline mr-2" />
                  All Patients ({patients.length})
                </button>
                <button
                  onClick={() => setActiveTab("matches")}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 ${
                    activeTab === "matches"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Search className="h-4 w-4 inline mr-2" />
                  Trial Matches ({matches.length})
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="mt-4">
              {activeTab === "patients" && (
                <div className="bg-white border rounded-2xl">
                  {/* Filter bar */}
                  <div className="px-4 py-3 border-b flex items-center gap-3">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filter by condition..."
                      value={conditionFilter}
                      onChange={(e) => setConditionFilter(e.target.value)}
                      className="flex-1 text-sm border-0 focus:ring-0 focus:outline-none"
                    />
                  </div>
                  <PatientList
                    patients={patients.filter(
                      (p) =>
                        !conditionFilter ||
                        p.problems.some((prob) =>
                          prob.description?.toLowerCase().includes(conditionFilter.toLowerCase())
                        )
                    )}
                    loading={loading}
                    onSelectPatient={handleSelectPatient}
                  />
                </div>
              )}

              {activeTab === "matches" && (
                <div className="bg-white border rounded-2xl">
                  {selectedTrialForMatches ? (
                    <>
                      <div className="px-4 py-3 border-b">
                        <div className="text-sm text-gray-500">Matches for</div>
                        <div className="font-medium">{selectedTrialForMatches}</div>
                      </div>
                      <MatchResults
                        nctId={selectedTrialForMatches}
                        matches={matches}
                        loading={loadingMatches}
                        onUpdateStatus={handleUpdateStatus}
                      />
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Select a trial above to find matching patients</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <Link to="/providers/dashboard" className="hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
