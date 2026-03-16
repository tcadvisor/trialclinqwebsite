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
  batchAcceptMatches,
  addPatientToPipeline,
  calculateAge,
  formatPatientName,
  getPrimaryCondition,
  formatMatchScore,
  getStatusColor,
  getStatusLabel,
  type ElationPatientSummary,
  type ElationTrialMatch,
  type ConnectionStatus,
  type CommonCriterion,
  type MatchSummary,
  type MatchResult,
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
  CheckCircle2,
  UserPlus,
  TrendingUp,
  BarChart3,
  Sparkles,
  Target,
  Award,
  Activity,
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
// Trial Matcher (Enhanced with AI)
// ============================================================================

function TrialMatcher({
  trials,
  userId,
  onMatchComplete,
}: {
  trials: AddedTrial[];
  userId: string;
  onMatchComplete: (nctId: string, result: MatchResult) => void;
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
        trialTitle: trial.title,
        useAI: true,
      });

      if (result.ok) {
        onMatchComplete(selectedTrial, result);
      }
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">AI-Powered Patient Matching</h3>
          <p className="text-sm text-gray-600">
            Multi-factor analysis: conditions, medications, allergies, demographics & more
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <select
          value={selectedTrial}
          onChange={(e) => setSelectedTrial(e.target.value)}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">Select a trial to match patients...</option>
          {trials.map((trial) => (
            <option key={trial.nctId} value={trial.nctId}>
              {trial.title} ({trial.nctId})
            </option>
          ))}
        </select>
        <button
          onClick={handleMatch}
          disabled={!selectedTrial || matching}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl px-6 py-3 text-sm font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 shadow-md transition-all duration-200"
        >
          {matching ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              Find Matches
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Match Summary Card
// ============================================================================

function MatchSummaryCard({
  summary,
  commonCriteria,
  totalMatches,
}: {
  summary?: MatchSummary;
  commonCriteria?: CommonCriterion[];
  totalMatches: number;
}) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Match Distribution */}
      <div className="bg-white border rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-purple-500" />
          Match Distribution
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-gray-600">Highly Eligible</span>
            </div>
            <span className="font-semibold text-emerald-600">{summary.highlyEligible}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-400"></div>
              <span className="text-sm text-gray-600">Likely Eligible</span>
            </div>
            <span className="font-semibold text-green-600">{summary.likelyEligible}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
              <span className="text-sm text-gray-600">Potentially Eligible</span>
            </div>
            <span className="font-semibold text-yellow-600">{summary.potentiallyEligible}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-300"></div>
              <span className="text-sm text-gray-600">Likely Ineligible</span>
            </div>
            <span className="font-semibold text-gray-500">{summary.likelyIneligible}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total Matches</span>
            <span className="text-lg font-bold text-purple-600">{totalMatches}</span>
          </div>
        </div>
      </div>

      {/* Common Matching Criteria */}
      {commonCriteria && commonCriteria.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-indigo-500" />
            Common Matching Criteria
          </h4>
          <div className="space-y-2">
            {commonCriteria.slice(0, 5).map((criterion, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 truncate max-w-[200px]" title={criterion.criterion}>
                      {criterion.criterion}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">{criterion.percentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full transition-all duration-500"
                      style={{ width: `${criterion.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Batch Accept Controls
// ============================================================================

function BatchAcceptControls({
  nctId,
  userId,
  totalMatches,
  onBatchAccept,
}: {
  nctId: string;
  userId: string;
  totalMatches: number;
  onBatchAccept: () => void;
}) {
  const [threshold, setThreshold] = React.useState(60);
  const [accepting, setAccepting] = React.useState(false);
  const [result, setResult] = React.useState<{ count: number; pipelineCount: number } | null>(null);

  const handleBatchAccept = async () => {
    setAccepting(true);
    try {
      const res = await batchAcceptMatches(userId, nctId, {
        threshold,
        addToPipeline: true,
      });

      if (res.ok) {
        setResult({
          count: res.updatedCount || 0,
          pipelineCount: res.pipelineCount || 0,
        });
        onBatchAccept();
      }
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 mb-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Batch Accept Matches
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            Accept all patients with match score ≥ {threshold}% and add to pipeline
          </p>
        </div>

        {result && (
          <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
            <div className="text-xs text-gray-500">Accepted</div>
            <div className="text-lg font-bold text-emerald-600">{result.count} patients</div>
            <div className="text-xs text-gray-500">{result.pipelineCount} added to pipeline</div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">
            Minimum Score Threshold: <span className="font-semibold text-emerald-600">{threshold}%</span>
          </label>
          <input
            type="range"
            min="30"
            max="90"
            step="5"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>30%</span>
            <span>60%</span>
            <span>90%</span>
          </div>
        </div>

        <button
          onClick={handleBatchAccept}
          disabled={accepting || totalMatches === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl px-5 py-3 text-sm font-medium hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 shadow-md transition-all"
        >
          {accepting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Award className="h-4 w-4" />
              Accept & Add to Pipeline
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Score Range Filter
// ============================================================================

function ScoreRangeFilter({
  minScore,
  maxScore,
  onMinChange,
  onMaxChange,
  totalCount,
  filteredCount,
}: {
  minScore: number;
  maxScore: number;
  onMinChange: (val: number) => void;
  onMaxChange: (val: number) => void;
  totalCount: number;
  filteredCount: number;
}) {
  return (
    <div className="bg-white border rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-500" />
          Filter by Match Score
        </h4>
        <span className="text-sm text-gray-500">
          Showing <span className="font-semibold text-blue-600">{filteredCount}</span> of {totalCount} patients
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Min Score */}
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">
            Minimum Score: <span className="font-semibold text-gray-700">{minScore}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={minScore}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val <= maxScore) onMinChange(val);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Range Display */}
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
          <span className="text-lg font-bold text-blue-600">{minScore}%</span>
          <span className="text-gray-400">-</span>
          <span className="text-lg font-bold text-blue-600">{maxScore}%</span>
        </div>

        {/* Max Score */}
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">
            Maximum Score: <span className="font-semibold text-gray-700">{maxScore}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={maxScore}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= minScore) onMaxChange(val);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-500">Quick filters:</span>
        <button
          onClick={() => { onMinChange(0); onMaxChange(100); }}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            minScore === 0 && maxScore === 100
              ? "bg-blue-100 text-blue-700 font-medium"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => { onMinChange(80); onMaxChange(100); }}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            minScore === 80 && maxScore === 100
              ? "bg-emerald-100 text-emerald-700 font-medium"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Highly Eligible (80%+)
        </button>
        <button
          onClick={() => { onMinChange(65); onMaxChange(100); }}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            minScore === 65 && maxScore === 100
              ? "bg-green-100 text-green-700 font-medium"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Likely+ (65%+)
        </button>
        <button
          onClick={() => { onMinChange(50); onMaxChange(100); }}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            minScore === 50 && maxScore === 100
              ? "bg-yellow-100 text-yellow-700 font-medium"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Potential+ (50%+)
        </button>
        <button
          onClick={() => { onMinChange(0); onMaxChange(50); }}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            minScore === 0 && maxScore === 50
              ? "bg-red-100 text-red-700 font-medium"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Low Match (&lt;50%)
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Match Results (Enhanced with visual scoring)
// ============================================================================

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 bg-emerald-100";
  if (score >= 60) return "text-green-600 bg-green-100";
  if (score >= 40) return "text-yellow-600 bg-yellow-100";
  return "text-gray-600 bg-gray-100";
}

function getScoreGradient(score: number): string {
  if (score >= 80) return "from-emerald-400 to-emerald-500";
  if (score >= 60) return "from-green-400 to-green-500";
  if (score >= 40) return "from-yellow-400 to-yellow-500";
  return "from-gray-300 to-gray-400";
}

function MatchResults({
  nctId,
  matches,
  loading,
  userId,
  onUpdateStatus,
  onAddToPipeline,
}: {
  nctId: string;
  matches: ElationTrialMatch[];
  loading: boolean;
  userId: string;
  onUpdateStatus: (patientId: number, status: ElationTrialMatch["eligibilityStatus"]) => void;
  onAddToPipeline: (patientId: number) => void;
}) {
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const [addingToPipeline, setAddingToPipeline] = React.useState<number | null>(null);

  const handleAddToPipeline = async (patientId: number) => {
    setAddingToPipeline(patientId);
    try {
      const result = await addPatientToPipeline(userId, patientId, nctId);
      if (result.ok) {
        onAddToPipeline(patientId);
      }
    } finally {
      setAddingToPipeline(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
          <Sparkles className="h-4 w-4 text-purple-400 absolute -top-1 -right-1 animate-pulse" />
        </div>
        <p className="mt-4 text-sm text-gray-500">Analyzing patient eligibility...</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <Search className="h-8 w-8 text-gray-300" />
        </div>
        <p className="font-medium">No matches found for this trial</p>
        <p className="text-sm mt-1">Try syncing more patients or adjusting trial criteria</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {matches.map((match) => (
        <div key={match.patientId} className="p-5 hover:bg-gray-50/50 transition-colors">
          <div className="flex items-start gap-4">
            {/* Score Circle */}
            <div className="flex-shrink-0">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center ${getScoreColor(match.matchScore)} font-bold text-lg`}>
                {match.matchScore}
              </div>
            </div>

            {/* Patient Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h4 className="font-semibold text-gray-900">
                  {match.firstName} {match.lastName}
                </h4>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(match.eligibilityStatus)}`}>
                  {getStatusLabel(match.eligibilityStatus)}
                </span>
              </div>

              {/* Score Bar */}
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                  <div
                    className={`h-full bg-gradient-to-r ${getScoreGradient(match.matchScore)} rounded-full transition-all duration-500`}
                    style={{ width: `${match.matchScore}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{match.matchScore}% match</span>
              </div>

              {/* Quick Summary */}
              {match.matchReasons.length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded">
                    <Check className="h-3 w-3" />
                    {match.matchReasons.length} criteria matched
                  </span>
                </div>
              )}

              {/* Expandable Details */}
              {match.matchReasons.length > 0 && (
                <button
                  onClick={() => setExpandedId(expandedId === match.patientId ? null : match.patientId)}
                  className="mt-2 text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 font-medium"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${expandedId === match.patientId ? "rotate-180" : ""}`} />
                  {expandedId === match.patientId ? "Hide details" : "View matching criteria"}
                </button>
              )}

              {expandedId === match.patientId && (
                <div className="mt-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                  <h5 className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Matching Criteria
                  </h5>
                  <div className="space-y-1.5">
                    {match.matchReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 flex flex-col gap-2">
              {match.eligibilityStatus === "potential" && (
                <div className="flex gap-1">
                  <button
                    onClick={() => onUpdateStatus(match.patientId, "eligible")}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Mark as eligible"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onUpdateStatus(match.patientId, "ineligible")}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Mark as ineligible"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              {(match.eligibilityStatus === "potential" || match.eligibilityStatus === "eligible") && (
                <button
                  onClick={() => handleAddToPipeline(match.patientId)}
                  disabled={addingToPipeline === match.patientId}
                  className="flex items-center gap-1.5 border border-purple-200 text-purple-600 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-purple-50 disabled:opacity-50 transition-colors"
                >
                  {addingToPipeline === match.patientId ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  Add to Pipeline
                </button>
              )}

              {match.eligibilityStatus === "eligible" && match.email && (
                <a
                  href={`mailto:${match.email}?subject=Clinical Trial Opportunity - ${nctId}`}
                  onClick={() => onUpdateStatus(match.patientId, "contacted")}
                  className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Contact
                </a>
              )}

              {match.eligibilityStatus === "contacted" && (
                <button
                  onClick={() => onUpdateStatus(match.patientId, "enrolled")}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Enrolled
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
  const [matchResult, setMatchResult] = React.useState<MatchResult | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [loadingMatches, setLoadingMatches] = React.useState(false);

  const [conditionFilter, setConditionFilter] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"patients" | "matches">("patients");

  // Score range filter for matches
  const [scoreFilterMin, setScoreFilterMin] = React.useState(0);
  const [scoreFilterMax, setScoreFilterMax] = React.useState(100);

  // Filtered matches based on score range
  const filteredMatches = React.useMemo(() => {
    return matches.filter(m => m.matchScore >= scoreFilterMin && m.matchScore <= scoreFilterMax);
  }, [matches, scoreFilterMin, scoreFilterMax]);

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

  const handleMatchComplete = async (nctId: string, result: MatchResult) => {
    setSelectedTrialForMatches(nctId);
    setMatchResult(result);
    setActiveTab("matches");

    // Load detailed matches
    setLoadingMatches(true);
    try {
      const matchesResult = await getTrialMatches(userId, nctId);
      if (matchesResult.ok && matchesResult.matches) {
        setMatches(matchesResult.matches);
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

  const handleAddToPipeline = (patientId: number) => {
    // Update local state to reflect patient was added
    setMatches((prev) =>
      prev.map((m) => (m.patientId === patientId ? { ...m, eligibilityStatus: "eligible" as const } : m))
    );
  };

  const handleBatchAccept = async () => {
    // Refresh matches after batch accept
    if (selectedTrialForMatches) {
      const matchesResult = await getTrialMatches(userId, selectedTrialForMatches);
      if (matchesResult.ok && matchesResult.matches) {
        setMatches(matchesResult.matches);
      }
    }
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
                <div>
                  {selectedTrialForMatches ? (
                    <>
                      {/* Match Summary */}
                      {matchResult && (
                        <MatchSummaryCard
                          summary={matchResult.matchSummary}
                          commonCriteria={matchResult.commonCriteria}
                          totalMatches={matchResult.matchCount || matches.length}
                        />
                      )}

                      {/* Score Range Filter */}
                      {matches.length > 0 && (
                        <ScoreRangeFilter
                          minScore={scoreFilterMin}
                          maxScore={scoreFilterMax}
                          onMinChange={setScoreFilterMin}
                          onMaxChange={setScoreFilterMax}
                          totalCount={matches.length}
                          filteredCount={filteredMatches.length}
                        />
                      )}

                      {/* Batch Accept Controls */}
                      <BatchAcceptControls
                        nctId={selectedTrialForMatches}
                        userId={userId}
                        totalMatches={filteredMatches.length}
                        onBatchAccept={handleBatchAccept}
                      />

                      {/* Match List */}
                      <div className="bg-white border rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wider">Matches for</div>
                              <div className="font-semibold text-gray-900">{selectedTrialForMatches}</div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">
                                {filteredMatches.length === matches.length
                                  ? `${matches.length} patients`
                                  : `${filteredMatches.length} of ${matches.length} patients`}
                              </span>
                              {matchResult?.useAI && (
                                <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-full text-xs font-medium">
                                  <Sparkles className="h-3 w-3" />
                                  AI-Powered
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <MatchResults
                          nctId={selectedTrialForMatches}
                          matches={filteredMatches}
                          loading={loadingMatches}
                          userId={userId}
                          onUpdateStatus={handleUpdateStatus}
                          onAddToPipeline={handleAddToPipeline}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="bg-white border rounded-2xl text-center py-16 text-gray-500">
                      <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
                        <Target className="h-8 w-8 text-purple-300" />
                      </div>
                      <p className="font-medium">Select a trial above to find matching patients</p>
                      <p className="text-sm mt-1">Our AI will analyze your patient panel against trial criteria</p>
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
