import { addCsrfHeader } from "./csrf";

export type PipelineStatus =
  | "interested"
  | "contacted"
  | "screening"
  | "screened"
  | "eligible"
  | "ineligible"
  | "enrolled"
  | "active"
  | "completed"
  | "withdrawn"
  | "lost_to_followup";

export type PatientPipelineEntry = {
  id?: number;
  providerId: string;
  patientId: string;
  nctId: string;
  status: PipelineStatus;
  matchScore?: number;
  notes?: string;
  contactedAt?: string;
  screenedAt?: string;
  enrolledAt?: string;
  withdrawnAt?: string;
  withdrawalReason?: string;
  createdAt?: string;
  updatedAt?: string;
  // Joined patient data
  patientEmail?: string;
  patientAge?: string;
  patientGender?: string;
  primaryCondition?: string;
};

export type StatusCounts = Record<PipelineStatus, number>;

const STATUS_ORDER: PipelineStatus[] = [
  "interested",
  "contacted",
  "screening",
  "screened",
  "eligible",
  "enrolled",
  "active",
  "completed",
];

const STATUS_LABELS: Record<PipelineStatus, string> = {
  interested: "Interested",
  contacted: "Contacted",
  screening: "Screening",
  screened: "Screened",
  eligible: "Eligible",
  ineligible: "Ineligible",
  enrolled: "Enrolled",
  active: "Active",
  completed: "Completed",
  withdrawn: "Withdrawn",
  lost_to_followup: "Lost to Follow-up",
};

const STATUS_COLORS: Record<PipelineStatus, string> = {
  interested: "bg-blue-100 text-blue-800",
  contacted: "bg-indigo-100 text-indigo-800",
  screening: "bg-yellow-100 text-yellow-800",
  screened: "bg-orange-100 text-orange-800",
  eligible: "bg-green-100 text-green-800",
  ineligible: "bg-red-100 text-red-800",
  enrolled: "bg-emerald-100 text-emerald-800",
  active: "bg-teal-100 text-teal-800",
  completed: "bg-gray-100 text-gray-800",
  withdrawn: "bg-red-100 text-red-800",
  lost_to_followup: "bg-gray-100 text-gray-600",
};

export function getStatusLabel(status: PipelineStatus): string {
  return STATUS_LABELS[status] || status;
}

export function getStatusColor(status: PipelineStatus): string {
  return STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
}

export function getStatusOrder(): PipelineStatus[] {
  return STATUS_ORDER;
}

export function getNextStatus(current: PipelineStatus): PipelineStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx >= 0 && idx < STATUS_ORDER.length - 1) {
    return STATUS_ORDER[idx + 1];
  }
  return null;
}

// API functions
export async function getPipelinePatients(
  userId: string,
  filters?: { nctId?: string; status?: PipelineStatus; patientId?: string }
): Promise<{
  ok: boolean;
  patients: PatientPipelineEntry[];
  statusCounts: Partial<StatusCounts>;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (filters?.nctId) params.set("nctId", filters.nctId);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.patientId) params.set("patientId", filters.patientId);

    const queryString = params.toString();
    const url = `/api/patient-pipeline${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-provider-id": userId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, patients: [], statusCounts: {}, error: data.error };
    }

    return {
      ok: true,
      patients: data.patients || [],
      statusCounts: data.statusCounts || {},
    };
  } catch (error) {
    console.error("Failed to fetch pipeline patients:", error);
    return {
      ok: false,
      patients: [],
      statusCounts: {},
      error: "Failed to fetch patients",
    };
  }
}

export async function addToPipeline(
  userId: string,
  entry: {
    patientId: string;
    nctId: string;
    status?: PipelineStatus;
    matchScore?: number;
    notes?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await addCsrfHeader({
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-provider-id": userId,
    });

    const response = await fetch("/api/patient-pipeline", {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId: entry.patientId,
        nctId: entry.nctId,
        status: entry.status || "interested",
        matchScore: entry.matchScore,
        notes: entry.notes,
      }),
    });

    const data = await response.json();
    return { ok: response.ok, error: data.error };
  } catch (error) {
    console.error("Failed to add to pipeline:", error);
    return { ok: false, error: "Failed to add patient" };
  }
}

export async function updatePipelineStatus(
  userId: string,
  patientId: string,
  nctId: string,
  updates: {
    status?: PipelineStatus;
    notes?: string;
    matchScore?: number;
    withdrawalReason?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await addCsrfHeader({
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-provider-id": userId,
    });

    const response = await fetch("/api/patient-pipeline", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        patientId,
        nctId,
        ...updates,
      }),
    });

    const data = await response.json();
    return { ok: response.ok, error: data.error };
  } catch (error) {
    console.error("Failed to update pipeline status:", error);
    return { ok: false, error: "Failed to update status" };
  }
}

export async function moveToNextStage(
  userId: string,
  patientId: string,
  nctId: string
): Promise<{ ok: boolean; newStatus?: PipelineStatus; error?: string }> {
  // First get current status
  const { ok, patients } = await getPipelinePatients(userId, { patientId, nctId });

  if (!ok || patients.length === 0) {
    return { ok: false, error: "Patient not found in pipeline" };
  }

  const current = patients[0];
  const nextStatus = getNextStatus(current.status);

  if (!nextStatus) {
    return { ok: false, error: "Patient is already at final stage" };
  }

  const result = await updatePipelineStatus(userId, patientId, nctId, { status: nextStatus });

  return { ...result, newStatus: nextStatus };
}

// Bulk operations
export async function bulkUpdateStatus(
  userId: string,
  entries: { patientId: string; nctId: string }[],
  newStatus: PipelineStatus
): Promise<{ ok: boolean; successCount: number; failCount: number }> {
  let successCount = 0;
  let failCount = 0;

  for (const entry of entries) {
    const result = await updatePipelineStatus(userId, entry.patientId, entry.nctId, {
      status: newStatus,
    });

    if (result.ok) {
      successCount++;
    } else {
      failCount++;
    }
  }

  return {
    ok: failCount === 0,
    successCount,
    failCount,
  };
}

// Get pipeline statistics
export async function getPipelineStats(userId: string): Promise<{
  totalPatients: number;
  statusCounts: Partial<StatusCounts>;
  conversionRate: number;
}> {
  const { patients, statusCounts } = await getPipelinePatients(userId);

  const interested = statusCounts.interested || 0;
  const enrolled = (statusCounts.enrolled || 0) + (statusCounts.active || 0);

  return {
    totalPatients: patients.length,
    statusCounts,
    conversionRate: interested > 0 ? Math.round((enrolled / interested) * 100) : 0,
  };
}
