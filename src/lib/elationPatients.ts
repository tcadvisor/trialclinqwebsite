/**
 * Elation Patient Management for Providers
 *
 * Handles syncing, caching, and matching Elation patients to clinical trials.
 */

import { getCsrfToken } from "./csrf";

const API_BASE = "/.netlify/functions/elation";

// ============================================================================
// Types
// ============================================================================

export interface ElationPatientSummary {
  id: number;
  firstName: string;
  lastName: string;
  dob: string;
  sex: string;
  email?: string;
  phone?: string;
  location?: string;
  problems: ElationProblem[];
  allergies: ElationAllergy[];
  medications: ElationMedication[];
  lastSynced: string;
}

export interface ElationProblem {
  id: number;
  icd10_code?: string;
  description: string;
  status: string;
  onset_date?: string;
}

export interface ElationAllergy {
  id: number;
  name: string;
  status: string;
  reaction?: string;
  severity?: string;
}

export interface ElationMedication {
  id: number;
  medication_name: string;
  sig?: string;
  status: string;
}

export interface ElationTrialMatch {
  patientId: number;
  firstName: string;
  lastName: string;
  email?: string;
  matchScore: number;
  matchReasons: string[];
  eligibilityStatus: "potential" | "eligible" | "ineligible" | "contacted" | "enrolled";
  contactedAt?: string;
  problems: ElationProblem[];
}

export interface ConnectionStatus {
  ok: boolean;
  connected: boolean;
  configured?: boolean;
  practiceName?: string;
  lastSync?: string;
  connectedAt?: string;
  patientCount?: number;
  error?: string;
}

export interface SyncResult {
  ok: boolean;
  syncedCount?: number;
  totalCount?: number;
  syncedAt?: string;
  error?: string;
}

export interface MatchResult {
  ok: boolean;
  matchCount?: number;
  nctId?: string;
  useAI?: boolean;
  aiModel?: string;
  commonCriteria?: CommonCriterion[];
  matchSummary?: MatchSummary;
  topMatches?: TopMatch[];
  error?: string;
}

export interface CommonCriterion {
  criterion: string;
  count: number;
  percentage: number;
}

export interface MatchSummary {
  highlyEligible: number;
  likelyEligible: number;
  potentiallyEligible: number;
  likelyIneligible: number;
}

export interface TopMatch {
  patientId: number;
  patientName: string;
  score: number;
  eligibilityStatus: string;
  confidence?: number;
  matchingConditions?: string[];
  concerns?: string[];
  recommendation?: string;
  reasoning?: string;
  aiPowered?: boolean;
  matchFactors?: MatchFactor[];
  reasons?: string[];
}

export interface MatchFactor {
  category: string;
  name: string;
  score: number;
  maxScore: number;
  matched: boolean;
  reason: string;
}

export interface BatchAcceptResult {
  ok: boolean;
  updatedCount?: number;
  pipelineCount?: number;
  threshold?: number;
  newStatus?: string;
  error?: string;
}

// ============================================================================
// API Functions
// ============================================================================

async function getHeaders(userId: string): Promise<Record<string, string>> {
  let csrfToken: string | null = null;
  try {
    csrfToken = await getCsrfToken();
  } catch {}
  return {
    "Content-Type": "application/json",
    "x-user-id": userId,
    "x-provider-id": userId,
    ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
  };
}

/**
 * Check Elation connection status
 */
export async function getConnectionStatus(userId: string): Promise<ConnectionStatus> {
  try {
    const response = await fetch(`${API_BASE}?action=status&providerId=${encodeURIComponent(userId)}`, {
      headers: await getHeaders(userId),
    });

    if (!response.ok) {
      return { ok: false, connected: false, error: await response.text() };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, connected: false, error: err instanceof Error ? err.message : "Connection check failed" };
  }
}

/**
 * Initiate Elation OAuth connection
 */
export async function initiateConnection(userId: string): Promise<{ ok: boolean; authUrl?: string; error?: string }> {
  try {
    const redirectUri = `${window.location.origin}/providers/elation-callback`;

    const response = await fetch(API_BASE, {
      method: "POST",
      headers: await getHeaders(userId),
      body: JSON.stringify({
        action: "initiate_oauth",
        providerId: userId,
        redirectUri,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: await response.text() };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to initiate connection" };
  }
}

/**
 * Complete Elation OAuth connection
 */
export async function completeConnection(
  userId: string,
  code: string,
  state: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const redirectUri = `${window.location.origin}/providers/elation-callback`;

    const response = await fetch(API_BASE, {
      method: "POST",
      headers: await getHeaders(userId),
      body: JSON.stringify({
        action: "complete_oauth",
        providerId: userId,
        code,
        state,
        redirectUri,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: await response.text() };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to complete connection" };
  }
}

/**
 * Sync patients from Elation
 */
export async function syncPatients(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    problemFilter?: string;
  }
): Promise<SyncResult> {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: await getHeaders(userId),
      body: JSON.stringify({
        action: "sync_patients",
        providerId: userId,
        ...options,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: await response.text() };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
}

/**
 * Get synced patients
 */
export async function getPatients(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    condition?: string;
  }
): Promise<{ ok: boolean; patients?: ElationPatientSummary[]; totalCount?: number; error?: string }> {
  try {
    const params = new URLSearchParams({
      action: "patients",
      providerId: userId,
    });
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.offset) params.set("offset", options.offset.toString());
    if (options?.condition) params.set("condition", options.condition);

    const response = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: await getHeaders(userId),
    });

    if (!response.ok) {
      return { ok: false, error: await response.text() };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch patients" };
  }
}

/**
 * Run matching for a trial against Elation patients
 */
export async function matchTrialToPatients(
  userId: string,
  nctId: string,
  criteria: {
    conditions?: string[];
    inclusionCriteria?: string[];
    exclusionCriteria?: string[];
    minAge?: string;
    maxAge?: string;
    gender?: string;
    trialTitle?: string;
    phase?: string;
    useAI?: boolean;
  }
): Promise<MatchResult> {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: await getHeaders(userId),
      body: JSON.stringify({
        action: "match_trial",
        providerId: userId,
        nctId,
        trialTitle: criteria.trialTitle,
        trialConditions: criteria.conditions,
        inclusionCriteria: criteria.inclusionCriteria,
        exclusionCriteria: criteria.exclusionCriteria,
        minAge: criteria.minAge,
        maxAge: criteria.maxAge,
        gender: criteria.gender,
        phase: criteria.phase,
        useAI: criteria.useAI ?? true,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: await response.text() };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Matching failed" };
  }
}

/**
 * Batch accept matches above a threshold
 */
export async function batchAcceptMatches(
  userId: string,
  nctId: string,
  options: {
    threshold?: number;
    newStatus?: string;
    addToPipeline?: boolean;
  } = {}
): Promise<BatchAcceptResult> {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: await getHeaders(userId),
      body: JSON.stringify({
        action: "batch_accept_matches",
        providerId: userId,
        nctId,
        threshold: options.threshold ?? 60,
        newStatus: options.newStatus ?? "eligible",
        addToPipeline: options.addToPipeline ?? true,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: await response.text() };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Batch accept failed" };
  }
}

/**
 * Add a single patient to the pipeline
 */
export async function addPatientToPipeline(
  userId: string,
  elationPatientId: number,
  nctId: string,
  notes?: string
): Promise<{ ok: boolean; patientId?: string; pipelineId?: number; error?: string }> {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: await getHeaders(userId),
      body: JSON.stringify({
        action: "add_to_pipeline",
        providerId: userId,
        elationPatientId,
        nctId,
        notes,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: await response.text() };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to add to pipeline" };
  }
}

/**
 * Get matches for a specific trial
 */
export async function getTrialMatches(
  userId: string,
  nctId: string
): Promise<{ ok: boolean; matches?: ElationTrialMatch[]; error?: string }> {
  try {
    const response = await fetch(
      `${API_BASE}?action=matches&providerId=${encodeURIComponent(userId)}&nctId=${encodeURIComponent(nctId)}`,
      {
        headers: await getHeaders(userId),
      }
    );

    if (!response.ok) {
      return { ok: false, error: await response.text() };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch matches" };
  }
}

/**
 * Update match status
 */
export async function updateMatchStatus(
  userId: string,
  elationPatientId: number,
  nctId: string,
  status: ElationTrialMatch["eligibilityStatus"]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: await getHeaders(userId),
      body: JSON.stringify({
        action: "update_match",
        providerId: userId,
        elationPatientId,
        nctId,
        status,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: await response.text() };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update status" };
  }
}

/**
 * Disconnect Elation integration
 */
export async function disconnectElation(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: await getHeaders(userId),
      body: JSON.stringify({
        action: "disconnect",
        providerId: userId,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: await response.text() };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to disconnect" };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate age from DOB
 */
export function calculateAge(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

/**
 * Format patient name
 */
export function formatPatientName(patient: ElationPatientSummary): string {
  return `${patient.firstName} ${patient.lastName}`;
}

/**
 * Get primary condition from problems list
 */
export function getPrimaryCondition(problems: ElationProblem[]): string | null {
  const active = problems.filter((p) => p.status === "Active");
  return active.length > 0 ? active[0].description : null;
}

/**
 * Format match score as percentage
 */
export function formatMatchScore(score: number): string {
  return `${Math.min(Math.round(score), 100)}%`;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: ElationTrialMatch["eligibilityStatus"]): string {
  switch (status) {
    case "eligible":
      return "bg-green-100 text-green-700";
    case "enrolled":
      return "bg-emerald-100 text-emerald-700";
    case "contacted":
      return "bg-blue-100 text-blue-700";
    case "ineligible":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/**
 * Get status label
 */
export function getStatusLabel(status: ElationTrialMatch["eligibilityStatus"]): string {
  switch (status) {
    case "potential":
      return "Potential Match";
    case "eligible":
      return "Eligible";
    case "ineligible":
      return "Ineligible";
    case "contacted":
      return "Contacted";
    case "enrolled":
      return "Enrolled";
    default:
      return status;
  }
}
