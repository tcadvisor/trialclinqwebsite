/**
 * Elation Health EHR Integration
 *
 * Handles OAuth 2.0 authentication and patient data fetching from Elation Health API.
 * Used by clinical trial researchers to import patient panels for trial matching.
 *
 * API Documentation: https://docs.elationhealth.com/reference/introduction
 *
 * Note: Elation API key should be configured server-side only.
 * Frontend calls go through our Netlify functions which hold the credentials.
 */

// ============================================================================
// Types - Based on Elation API v2.0 schema
// ============================================================================

export interface ElationPatient {
  id: number;
  first_name: string;
  last_name: string;
  dob: string; // YYYY-MM-DD
  sex: "Male" | "Female" | "Other" | "Unknown";
  email?: string;
  primary_phone?: string;
  address?: ElationAddress;
  practice?: number;
  primary_physician?: number;
  caregiver_practice?: number;
  created_date?: string;
  last_modified_date?: string;
}

export interface ElationAddress {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface ElationProblem {
  id: number;
  patient: number;
  icd10_code?: string;
  icd9_code?: string;
  snomed_code?: string;
  description: string;
  status: "Active" | "Resolved" | "Inactive";
  onset_date?: string;
  resolved_date?: string;
  dx_date?: string;
  created_date?: string;
}

export interface ElationAllergy {
  id: number;
  patient: number;
  name: string;
  status: "Active" | "Inactive";
  reaction?: string;
  severity?: "Mild" | "Moderate" | "Severe" | "Unknown";
  onset_date?: string;
  created_date?: string;
}

export interface ElationMedication {
  id: number;
  patient: number;
  medication_name: string;
  ndc?: string;
  rxnorm?: string;
  sig?: string; // Dosage instructions
  qty?: number;
  refills?: number;
  status: "Active" | "Discontinued" | "On Hold";
  start_date?: string;
  end_date?: string;
  created_date?: string;
}

export interface ElationVitals {
  id: number;
  patient: number;
  height?: number; // inches
  weight?: number; // lbs
  bmi?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  respiratory_rate?: number;
  service_date?: string;
  created_date?: string;
}

export interface ElationLabResult {
  id: number;
  patient: number;
  test_name: string;
  loinc_code?: string;
  value?: string;
  unit?: string;
  reference_range?: string;
  status: "Final" | "Preliminary" | "Corrected";
  abnormal_flag?: "Normal" | "High" | "Low" | "Critical";
  service_date?: string;
  created_date?: string;
}

export interface ElationImmunization {
  id: number;
  patient: number;
  vaccine_name: string;
  cvx_code?: string;
  administration_date?: string;
  lot_number?: string;
  manufacturer?: string;
  site?: string;
  created_date?: string;
}

// Composite patient profile for matching
export interface ElationPatientProfile {
  patient: ElationPatient;
  problems: ElationProblem[];
  allergies: ElationAllergy[];
  medications: ElationMedication[];
  vitals?: ElationVitals;
  labResults: ElationLabResult[];
  immunizations: ElationImmunization[];
}

// Paginated response from Elation
export interface ElationPaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// ============================================================================
// API Result Types
// ============================================================================

export interface ElationSyncResult {
  ok: boolean;
  patients?: ElationPatientProfile[];
  totalCount?: number;
  syncedAt?: string;
  error?: string;
}

export interface ElationConnectionStatus {
  ok: boolean;
  connected: boolean;
  practiceName?: string;
  lastSync?: string;
  patientCount?: number;
  error?: string;
}

// ============================================================================
// API Client Functions - Call backend endpoints
// ============================================================================

const API_BASE = "/.netlify/functions";

/**
 * Check if Elation is configured and connected
 */
export async function checkElationConnection(providerId: string): Promise<ElationConnectionStatus> {
  try {
    const response = await fetch(`${API_BASE}/elation?action=status&providerId=${encodeURIComponent(providerId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.text();
      return { ok: false, connected: false, error };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, connected: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

/**
 * Initiate OAuth flow for Elation connection
 * Returns the authorization URL to redirect the user to
 */
export async function initiateElationOAuth(providerId: string, redirectUri: string): Promise<{ ok: boolean; authUrl?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/elation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "initiate_oauth",
        providerId,
        redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { ok: false, error };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to initiate OAuth" };
  }
}

/**
 * Complete OAuth flow after redirect
 */
export async function completeElationOAuth(
  providerId: string,
  code: string,
  state: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/elation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete_oauth",
        providerId,
        code,
        state,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { ok: false, error };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to complete OAuth" };
  }
}

/**
 * Sync patients from Elation to local database
 * @param providerId - The provider's user ID
 * @param options - Sync options (filters, pagination)
 */
export async function syncElationPatients(
  providerId: string,
  options?: {
    limit?: number;
    offset?: number;
    modifiedSince?: string;
    problemFilter?: string; // Filter by condition/problem
  }
): Promise<ElationSyncResult> {
  try {
    const response = await fetch(`${API_BASE}/elation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync_patients",
        providerId,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { ok: false, error };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
}

/**
 * Get a single patient's full profile from Elation
 */
export async function getElationPatientProfile(
  providerId: string,
  elationPatientId: number
): Promise<{ ok: boolean; profile?: ElationPatientProfile; error?: string }> {
  try {
    const response = await fetch(
      `${API_BASE}/elation?action=patient&providerId=${encodeURIComponent(providerId)}&patientId=${elationPatientId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { ok: false, error };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch patient" };
  }
}

/**
 * Disconnect Elation integration
 */
export async function disconnectElation(providerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/elation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "disconnect",
        providerId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { ok: false, error };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to disconnect" };
  }
}

// ============================================================================
// Patient Data Transformation - Convert Elation data to matching format
// ============================================================================

/**
 * Transform Elation patient profile to the format used by our matching system
 */
export function transformToMatchingProfile(profile: ElationPatientProfile): {
  age: number | null;
  gender: string | null;
  primaryCondition: string | null;
  medications: string[];
  allergies: string[];
  additionalInfo: string | null;
} {
  // Calculate age from DOB
  const dob = profile.patient.dob ? new Date(profile.patient.dob) : null;
  const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  // Map gender
  const genderMap: Record<string, string> = {
    Male: "male",
    Female: "female",
    Other: "other",
    Unknown: "unknown",
  };
  const gender = genderMap[profile.patient.sex] || null;

  // Get primary condition (first active problem)
  const activeProblems = profile.problems.filter((p) => p.status === "Active");
  const primaryCondition = activeProblems.length > 0 ? activeProblems[0].description : null;

  // Get medications list
  const medications = profile.medications
    .filter((m) => m.status === "Active")
    .map((m) => m.medication_name);

  // Get allergies list
  const allergies = profile.allergies
    .filter((a) => a.status === "Active")
    .map((a) => a.name);

  // Build additional info from other conditions
  const otherConditions = activeProblems.slice(1).map((p) => p.description);
  const additionalInfo = otherConditions.length > 0 ? `Other conditions: ${otherConditions.join(", ")}` : null;

  return {
    age,
    gender,
    primaryCondition,
    medications,
    allergies,
    additionalInfo,
  };
}

/**
 * Get all active ICD-10 codes from patient problems
 */
export function getPatientICD10Codes(problems: ElationProblem[]): string[] {
  return problems
    .filter((p) => p.status === "Active" && p.icd10_code)
    .map((p) => p.icd10_code!);
}

/**
 * Get all active SNOMED codes from patient problems
 */
export function getPatientSNOMEDCodes(problems: ElationProblem[]): string[] {
  return problems
    .filter((p) => p.status === "Active" && p.snomed_code)
    .map((p) => p.snomed_code!);
}

/**
 * Check if patient has any of the specified conditions (by ICD-10 prefix)
 */
export function patientHasConditionPrefix(problems: ElationProblem[], icd10Prefixes: string[]): boolean {
  const patientCodes = getPatientICD10Codes(problems);
  return patientCodes.some((code) => icd10Prefixes.some((prefix) => code.startsWith(prefix)));
}

// ============================================================================
// Local Storage Cache
// ============================================================================

const ELATION_CACHE_KEY = "tc_elation_patients_v1";
const ELATION_SYNC_KEY = "tc_elation_sync_v1";

export interface CachedElationData {
  providerId: string;
  patients: ElationPatientProfile[];
  syncedAt: string;
  totalCount: number;
}

/**
 * Get cached Elation patients
 */
export function getCachedElationPatients(providerId: string): CachedElationData | null {
  try {
    const cached = localStorage.getItem(ELATION_CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached) as CachedElationData;
    if (data.providerId !== providerId) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Cache Elation patients locally
 */
export function cacheElationPatients(providerId: string, patients: ElationPatientProfile[], totalCount: number): void {
  try {
    const data: CachedElationData = {
      providerId,
      patients,
      syncedAt: new Date().toISOString(),
      totalCount,
    };
    localStorage.setItem(ELATION_CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to cache Elation patients:", err);
  }
}

/**
 * Clear Elation cache
 */
export function clearElationCache(): void {
  try {
    localStorage.removeItem(ELATION_CACHE_KEY);
    localStorage.removeItem(ELATION_SYNC_KEY);
  } catch {
    // Ignore
  }
}
