import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { useAuth } from "../../lib/auth";
import { getAddedTrials, type AddedTrial } from "../../lib/providerTrials";
import {
  getDatabases,
  saveDatabase,
  deleteDatabase,
  getPatients,
  getAllPatients,
  savePatients,
  getTotalPatientCount,
  parseCSV,
  parseJSON,
  parseExcel,
  matchPatientsToTrial,
  getMatches,
  saveMatches,
  type CustomPatient,
  type CustomPatientDatabase,
  type CustomTrialMatch,
  type ParseResult,
  formatPatientName,
  formatMatchScore,
  getStatusColor,
  getStatusLabel,
} from "../../lib/customPatients";
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  Database,
  Users,
  Trash2,
  RefreshCw,
  Search,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Mail,
  Zap,
  Eye,
  Download,
  Plus,
} from "lucide-react";

// ============================================================================
// File Upload Zone
// ============================================================================

function FileUploadZone({
  onFileSelect,
  uploading,
}: {
  onFileSelect: (file: File) => void;
  uploading: boolean;
}) {
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
        dragActive
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.json"
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex justify-center gap-4 mb-4">
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
          <FileSpreadsheet className="h-6 w-6 text-green-600" />
        </div>
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
          <FileText className="h-6 w-6 text-blue-600" />
        </div>
        <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
          <FileJson className="h-6 w-6 text-purple-600" />
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">
        {uploading ? "Processing file..." : "Upload Patient Database"}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Drag and drop your file here, or click to browse
      </p>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Select File
          </>
        )}
      </button>

      <div className="mt-4 flex justify-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" /> CSV
        </span>
        <span className="flex items-center gap-1">
          <FileSpreadsheet className="h-3 w-3" /> Excel (.xlsx)
        </span>
        <span className="flex items-center gap-1">
          <FileJson className="h-3 w-3" /> JSON
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Parse Preview Modal
// ============================================================================

function ParsePreviewModal({
  result,
  fileName,
  onConfirm,
  onCancel,
}: {
  result: ParseResult;
  fileName: string;
  onConfirm: (name: string, description: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(fileName.replace(/\.[^/.]+$/, ""));
  const [description, setDescription] = React.useState("");
  const [showAllPatients, setShowAllPatients] = React.useState(false);

  const previewPatients = result.patients?.slice(0, showAllPatients ? 20 : 5) || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Review Import</h2>
          <p className="text-sm text-gray-600 mt-1">
            {result.validCount} of {result.rowCount} records ready to import
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Warnings and Errors */}
          {(result.errors?.length || result.warnings?.length) && (
            <div className="mb-4 space-y-2">
              {result.errors?.map((error, i) => (
                <div
                  key={`error-${i}`}
                  className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              ))}
              {result.warnings?.slice(0, 3).map((warning, i) => (
                <div
                  key={`warning-${i}`}
                  className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {warning}
                </div>
              ))}
              {(result.warnings?.length || 0) > 3 && (
                <div className="text-xs text-gray-500">
                  And {(result.warnings?.length || 0) - 3} more warnings...
                </div>
              )}
            </div>
          )}

          {/* Database Info */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Database Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g., Clinic A Patients"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g., Q1 2024 patient export"
              />
            </div>
          </div>

          {/* Patient Preview */}
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <span className="text-sm font-medium">Patient Preview</span>
              <span className="text-xs text-gray-500">
                Showing {previewPatients.length} of {result.validCount}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Age/DOB</th>
                    <th className="px-4 py-2">Gender</th>
                    <th className="px-4 py-2">Conditions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewPatients.map((patient, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-medium">
                        {formatPatientName(patient)}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {patient.email || "-"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {patient.age ? `${patient.age} years` : patient.dob || "-"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {patient.sex || "-"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {patient.conditions?.slice(0, 2).join(", ") || "-"}
                        {(patient.conditions?.length || 0) > 2 && "..."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(result.validCount || 0) > 5 && !showAllPatients && (
              <button
                onClick={() => setShowAllPatients(true)}
                className="w-full py-2 text-sm text-blue-600 hover:bg-gray-50 border-t"
              >
                Show more patients
              </button>
            )}
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(name, description)}
            disabled={!name.trim() || !result.validCount}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Import {result.validCount} Patients
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Database List
// ============================================================================

function DatabaseList({
  databases,
  selectedDb,
  onSelect,
  onDelete,
}: {
  databases: CustomPatientDatabase[];
  selectedDb: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (databases.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No databases uploaded yet</p>
        <p className="text-sm mt-1">Upload a CSV, Excel, or JSON file to get started</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {databases.map((db) => (
        <div
          key={db.id}
          onClick={() => onSelect(db.id)}
          className={`p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
            selectedDb === db.id ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                db.source === "csv"
                  ? "bg-green-100"
                  : db.source === "excel"
                  ? "bg-blue-100"
                  : "bg-purple-100"
              }`}
            >
              {db.source === "csv" ? (
                <FileText className="h-5 w-5 text-green-600" />
              ) : db.source === "excel" ? (
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              ) : (
                <FileJson className="h-5 w-5 text-purple-600" />
              )}
            </div>
            <div>
              <div className="font-medium">{db.name}</div>
              <div className="text-sm text-gray-500">
                {db.patientCount} patients • {new Date(db.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${db.name}"? This cannot be undone.`)) {
                  onDelete(db.id);
                }
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Patient List View
// ============================================================================

function PatientListView({
  patients,
  searchQuery,
  onSearchChange,
}: {
  patients: CustomPatient[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) {
  const filteredPatients = React.useMemo(() => {
    if (!searchQuery) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.firstName?.toLowerCase().includes(query) ||
        p.lastName?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.conditions?.some((c) => c.toLowerCase().includes(query))
    );
  }, [patients, searchQuery]);

  const [page, setPage] = React.useState(0);
  const perPage = 15;
  const totalPages = Math.ceil(filteredPatients.length / perPage);
  const paginatedPatients = filteredPatients.slice(page * perPage, (page + 1) * perPage);

  return (
    <div>
      {/* Search */}
      <div className="px-4 py-3 border-b flex items-center gap-3">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or condition..."
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setPage(0);
          }}
          className="flex-1 text-sm border-0 focus:ring-0 focus:outline-none"
        />
        <span className="text-xs text-gray-500">
          {filteredPatients.length} patients
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Conditions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedPatients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No patients found
                </td>
              </tr>
            ) : (
              paginatedPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {formatPatientName(patient)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {patient.email || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {patient.phone || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {patient.age || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {patient.sex || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {patient.city && patient.state
                      ? `${patient.city}, ${patient.state}`
                      : patient.location || patient.zipcode || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {patient.conditions?.slice(0, 2).join(", ") || "-"}
                    {(patient.conditions?.length || 0) > 2 && (
                      <span className="text-gray-400">
                        {" "}
                        +{(patient.conditions?.length || 0) - 2}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Trial Matcher Component
// ============================================================================

function TrialMatcher({
  patients,
  trials,
  userId,
  onMatchComplete,
}: {
  patients: CustomPatient[];
  trials: AddedTrial[];
  userId: string;
  onMatchComplete: (nctId: string, matches: CustomTrialMatch[]) => void;
}) {
  const [selectedTrial, setSelectedTrial] = React.useState<string>("");
  const [matching, setMatching] = React.useState(false);

  const handleMatch = () => {
    if (!selectedTrial) return;

    const trial = trials.find((t) => t.nctId === selectedTrial);
    if (!trial) return;

    setMatching(true);

    // Small delay for UI feedback
    setTimeout(() => {
      const matches = matchPatientsToTrial(patients, trial.conditions || [], {
        // Could extract from trial eligibility criteria
      });

      // Assign NCT ID to matches
      const matchesWithTrial = matches.map((m) => ({ ...m, nctId: selectedTrial }));

      // Save matches
      const existingMatches = getMatches(userId).filter((m) => m.nctId !== selectedTrial);
      saveMatches(userId, [...existingMatches, ...matchesWithTrial]);

      onMatchComplete(selectedTrial, matchesWithTrial);
      setMatching(false);
    }, 500);
  };

  return (
    <div className="bg-white border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
          <Zap className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold">Match Patients to Trial</h3>
          <p className="text-sm text-gray-600">
            Find eligible patients from your custom database
          </p>
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
          disabled={!selectedTrial || matching || patients.length === 0}
          className="flex items-center gap-2 bg-purple-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-purple-700 disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {matching ? "Matching..." : "Find Matches"}
        </button>
      </div>

      {patients.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">
          Upload a patient database first to start matching.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Match Results Component
// ============================================================================

function MatchResults({
  matches,
  nctId,
  onUpdateStatus,
}: {
  matches: CustomTrialMatch[];
  nctId: string;
  onUpdateStatus: (patientId: string, status: CustomTrialMatch["eligibilityStatus"]) => void;
}) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No matches found for this trial</p>
        <p className="text-sm mt-1">Try uploading more patients or selecting a different trial</p>
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
                  {formatPatientName(match.patient)}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    match.eligibilityStatus
                  )}`}
                >
                  {getStatusLabel(match.eligibilityStatus)}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Match Score:{" "}
                <span className="font-medium">
                  {formatMatchScore(match.matchScore)}
                </span>
              </div>
              {match.matchReasons.length > 0 && (
                <button
                  onClick={() =>
                    setExpandedId(expandedId === match.patientId ? null : match.patientId)
                  }
                  className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      expandedId === match.patientId ? "rotate-180" : ""
                    }`}
                  />
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
              {match.eligibilityStatus === "eligible" && match.patient.email && (
                <a
                  href={`mailto:${match.patient.email}?subject=Clinical Trial Opportunity - ${nctId}`}
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

export default function CustomPatientUpload(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.userId || "";

  // Data state
  const [databases, setDatabases] = React.useState<CustomPatientDatabase[]>([]);
  const [trials, setTrials] = React.useState<AddedTrial[]>([]);
  const [selectedDb, setSelectedDb] = React.useState<string | null>(null);
  const [patients, setPatients] = React.useState<CustomPatient[]>([]);
  const [matches, setMatches] = React.useState<CustomTrialMatch[]>([]);
  const [selectedTrialForMatches, setSelectedTrialForMatches] = React.useState<string>("");

  // UI state
  const [uploading, setUploading] = React.useState(false);
  const [parseResult, setParseResult] = React.useState<ParseResult | null>(null);
  const [parseFileName, setParseFileName] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"databases" | "patients" | "matches">("databases");

  // Load initial data
  React.useEffect(() => {
    if (!userId) return;

    setDatabases(getDatabases(userId));
    setTrials(getAddedTrials(userId));
    setMatches(getMatches(userId));
  }, [userId]);

  // Load patients when database selected
  React.useEffect(() => {
    if (!userId || !selectedDb) {
      setPatients([]);
      return;
    }

    setPatients(getPatients(userId, selectedDb));
    setActiveTab("patients");
  }, [userId, selectedDb]);

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    setUploading(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      let result: ParseResult;

      if (extension === "csv") {
        const content = await file.text();
        result = parseCSV(content, file.name);
      } else if (extension === "json") {
        const content = await file.text();
        result = parseJSON(content, file.name);
      } else if (extension === "xlsx" || extension === "xls") {
        result = await parseExcel(file);
      } else {
        result = { ok: false, errors: ["Unsupported file format"] };
      }

      if (result.ok && result.patients && result.patients.length > 0) {
        setParseResult(result);
        setParseFileName(file.name);
      } else {
        alert(result.errors?.join("\n") || "Failed to parse file");
      }
    } catch (err) {
      alert(`Error parsing file: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  // Confirm import
  const handleConfirmImport = (name: string, description: string) => {
    if (!parseResult?.patients || !userId) return;

    const dbId = `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const extension = parseFileName.split(".").pop()?.toLowerCase();

    const newDb: CustomPatientDatabase = {
      id: dbId,
      name,
      description: description || undefined,
      patientCount: parseResult.patients.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: extension === "json" ? "json" : extension === "xlsx" || extension === "xls" ? "excel" : "csv",
      fileName: parseFileName,
    };

    // Save database and patients
    saveDatabase(userId, newDb);
    savePatients(userId, dbId, parseResult.patients);

    // Update state
    setDatabases(getDatabases(userId));
    setSelectedDb(dbId);
    setParseResult(null);
    setParseFileName("");
  };

  // Delete database
  const handleDeleteDb = (dbId: string) => {
    deleteDatabase(userId, dbId);
    setDatabases(getDatabases(userId));
    if (selectedDb === dbId) {
      setSelectedDb(null);
      setPatients([]);
    }
  };

  // Handle match complete
  const handleMatchComplete = (nctId: string, newMatches: CustomTrialMatch[]) => {
    setSelectedTrialForMatches(nctId);
    setMatches(getMatches(userId));
    setActiveTab("matches");
  };

  // Update match status
  const handleUpdateMatchStatus = (patientId: string, status: CustomTrialMatch["eligibilityStatus"]) => {
    if (!selectedTrialForMatches) return;

    const updatedMatches = matches.map((m) =>
      m.patientId === patientId && m.nctId === selectedTrialForMatches
        ? { ...m, eligibilityStatus: status, updatedAt: new Date().toISOString() }
        : m
    );

    saveMatches(userId, updatedMatches);
    setMatches(updatedMatches);
  };

  const totalPatients = getTotalPatientCount(userId);
  const selectedMatches = matches.filter((m) => m.nctId === selectedTrialForMatches);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Custom Patient Database</h1>
            <p className="mt-1 text-sm text-gray-600">
              Upload and manage your own patient data for trial matching
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-semibold">{totalPatients}</div>
              <div className="text-xs text-gray-500">Total Patients</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">{databases.length}</div>
              <div className="text-xs text-gray-500">Databases</div>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <FileUploadZone onFileSelect={handleFileSelect} uploading={uploading} />

        {/* Trial Matcher */}
        {totalPatients > 0 && (
          <div className="mt-6">
            <TrialMatcher
              patients={getAllPatients(userId)}
              trials={trials}
              userId={userId}
              onMatchComplete={handleMatchComplete}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6 border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("databases")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 ${
                activeTab === "databases"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Database className="h-4 w-4 inline mr-2" />
              Databases ({databases.length})
            </button>
            <button
              onClick={() => setActiveTab("patients")}
              disabled={!selectedDb}
              className={`pb-3 px-1 text-sm font-medium border-b-2 ${
                activeTab === "patients"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              } disabled:opacity-50`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Patients {selectedDb ? `(${patients.length})` : ""}
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
          {activeTab === "databases" && (
            <div className="bg-white border rounded-2xl">
              <DatabaseList
                databases={databases}
                selectedDb={selectedDb}
                onSelect={setSelectedDb}
                onDelete={handleDeleteDb}
              />
            </div>
          )}

          {activeTab === "patients" && selectedDb && (
            <div className="bg-white border rounded-2xl">
              <PatientListView
                patients={patients}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
          )}

          {activeTab === "matches" && (
            <div className="bg-white border rounded-2xl">
              {selectedTrialForMatches ? (
                <>
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">Matches for</div>
                      <div className="font-medium">{selectedTrialForMatches}</div>
                    </div>
                    <select
                      value={selectedTrialForMatches}
                      onChange={(e) => setSelectedTrialForMatches(e.target.value)}
                      className="border rounded-lg px-3 py-1 text-sm"
                    >
                      {[...new Set(matches.map((m) => m.nctId))].map((nctId) => (
                        <option key={nctId} value={nctId}>
                          {nctId} ({matches.filter((m) => m.nctId === nctId).length} matches)
                        </option>
                      ))}
                    </select>
                  </div>
                  <MatchResults
                    matches={selectedMatches}
                    nctId={selectedTrialForMatches}
                    onUpdateStatus={handleUpdateMatchStatus}
                  />
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Select a trial above to find matching patients</p>
                  <p className="text-sm mt-1">
                    Or view existing matches by selecting from the dropdown
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="mt-6 text-sm text-gray-600">
          <Link to="/providers/dashboard" className="hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </main>

      {/* Parse Preview Modal */}
      {parseResult && (
        <ParsePreviewModal
          result={parseResult}
          fileName={parseFileName}
          onConfirm={handleConfirmImport}
          onCancel={() => {
            setParseResult(null);
            setParseFileName("");
          }}
        />
      )}
    </div>
  );
}
