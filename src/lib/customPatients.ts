/**
 * Custom Patient Database Management
 *
 * Handles uploading, storing, and matching custom patient data
 * from CSV, Excel, and JSON files. Separate from Elation EHR integration.
 *
 * STORAGE: Uses PostgreSQL backend via /api/custom-patients
 * with localStorage as fallback for offline mode.
 */

import { getCsrfToken } from "./csrf";

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE = "/api/custom-patients";

async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: any;
    params?: Record<string, string>;
  } = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const { method = "GET", body, params } = options;
    let url = `${API_BASE}${path}`;

    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add CSRF token for state-changing operations
    if (["POST", "PUT", "DELETE"].includes(method)) {
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }
    }

    // Add auth token if available
    const session = localStorage.getItem("tc_session_v1");
    if (session) {
      try {
        const { token } = JSON.parse(session);
        if (token) {
          headers["X-Session-Token"] = token;
        }
      } catch {}
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      return { ok: false, error: error.error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    console.warn("API request failed, using localStorage fallback:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

// ============================================================================
// Types
// ============================================================================

export interface CustomPatient {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dob?: string;
  age?: number;
  sex?: string;
  gender?: string;
  race?: string;
  language?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  conditions?: string[];
  medications?: string[];
  allergies?: string[];
  diagnosisYear?: string;
  diseaseStage?: string;
  ecog?: string;
  biomarkers?: string[];
  priorTherapies?: string[];
  comorbidities?: string[];
  notes?: string;
  source: string; // filename or "manual"
  importedAt: string;
  /** Store all original fields from the file for dynamic display */
  _raw?: Record<string, unknown>;
}

export interface CustomPatientDatabase {
  id: string;
  name: string;
  description?: string;
  patientCount: number;
  createdAt: string;
  updatedAt: string;
  source: "csv" | "excel" | "json" | "manual";
  fileName?: string;
}

export interface CustomTrialMatch {
  patientId: string;
  patient: CustomPatient;
  nctId: string;
  matchScore: number;
  matchReasons: string[];
  eligibilityStatus: "potential" | "eligible" | "ineligible" | "contacted" | "enrolled";
  notes?: string;
  updatedAt: string;
}

export interface ParseResult {
  ok: boolean;
  patients?: CustomPatient[];
  errors?: string[];
  warnings?: string[];
  rowCount?: number;
  validCount?: number;
  /** Original column headers from the file */
  columns?: string[];
  /** Raw row data preserving all original columns */
  rawData?: Record<string, unknown>[];
}

export interface ColumnMapping {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dob?: string;
  age?: string;
  sex?: string;
  gender?: string;
  race?: string;
  language?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  conditions?: string;
  medications?: string;
  allergies?: string;
  diagnosisYear?: string;
  diseaseStage?: string;
  ecog?: string;
  biomarkers?: string;
  priorTherapies?: string;
  comorbidities?: string;
  notes?: string;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  databases: (userId: string) => `custom:databases:v1:${userId}`,
  patients: (userId: string, dbId: string) => `custom:patients:v1:${userId}:${dbId}`,
  matches: (userId: string) => `custom:matches:v1:${userId}`,
};

// ============================================================================
// Database Management (API-first with localStorage fallback)
// ============================================================================

export async function getDatabasesAsync(userId: string): Promise<CustomPatientDatabase[]> {
  const result = await apiRequest<{ databases: CustomPatientDatabase[] }>("/databases");
  if (result.ok && result.data?.databases) {
    // Cache in localStorage for offline access
    localStorage.setItem(STORAGE_KEYS.databases(userId), JSON.stringify(result.data.databases));
    return result.data.databases;
  }
  // Fallback to localStorage
  return getDatabases(userId);
}

export function getDatabases(userId: string): CustomPatientDatabase[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.databases(userId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function saveDatabaseAsync(userId: string, db: CustomPatientDatabase): Promise<boolean> {
  const result = await apiRequest("/databases", { method: "POST", body: db });
  if (result.ok) {
    // Also update localStorage cache
    saveDatabase(userId, db);
    return true;
  }
  // Fallback to localStorage only
  saveDatabase(userId, db);
  return false;
}

export function saveDatabase(userId: string, db: CustomPatientDatabase): void {
  const databases = getDatabases(userId);
  const index = databases.findIndex((d) => d.id === db.id);
  if (index >= 0) {
    databases[index] = db;
  } else {
    databases.push(db);
  }
  localStorage.setItem(STORAGE_KEYS.databases(userId), JSON.stringify(databases));
}

export async function deleteDatabaseAsync(userId: string, dbId: string): Promise<boolean> {
  const result = await apiRequest(`/databases/${dbId}`, { method: "DELETE" });
  // Always update localStorage
  deleteDatabase(userId, dbId);
  return result.ok;
}

export function deleteDatabase(userId: string, dbId: string): void {
  const databases = getDatabases(userId).filter((d) => d.id !== dbId);
  localStorage.setItem(STORAGE_KEYS.databases(userId), JSON.stringify(databases));
  localStorage.removeItem(STORAGE_KEYS.patients(userId, dbId));
}

// ============================================================================
// Patient Management (API-first with localStorage fallback)
// ============================================================================

export async function getPatientsAsync(userId: string, dbId: string): Promise<CustomPatient[]> {
  const result = await apiRequest<{ patients: CustomPatient[] }>("/patients", {
    params: { databaseId: dbId },
  });
  if (result.ok && result.data?.patients) {
    // Cache in localStorage
    localStorage.setItem(STORAGE_KEYS.patients(userId, dbId), JSON.stringify(result.data.patients));
    return result.data.patients;
  }
  // Fallback to localStorage
  return getPatients(userId, dbId);
}

export function getPatients(userId: string, dbId: string): CustomPatient[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.patients(userId, dbId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function getAllPatientsAsync(userId: string): Promise<CustomPatient[]> {
  const result = await apiRequest<{ patients: CustomPatient[] }>("/patients");
  if (result.ok && result.data?.patients) {
    return result.data.patients;
  }
  // Fallback to localStorage
  return getAllPatients(userId);
}

export function getAllPatients(userId: string): CustomPatient[] {
  const databases = getDatabases(userId);
  return databases.flatMap((db) => getPatients(userId, db.id));
}

export async function savePatientsAsync(userId: string, dbId: string, patients: CustomPatient[]): Promise<boolean> {
  const result = await apiRequest("/patients", {
    method: "POST",
    body: { databaseId: dbId, patients },
  });
  // Always save to localStorage as cache
  savePatients(userId, dbId, patients);
  return result.ok;
}

export function savePatients(userId: string, dbId: string, patients: CustomPatient[]): void {
  localStorage.setItem(STORAGE_KEYS.patients(userId, dbId), JSON.stringify(patients));
}

export function getTotalPatientCount(userId: string): number {
  return getDatabases(userId).reduce((sum, db) => sum + db.patientCount, 0);
}

// ============================================================================
// File Parsing
// ============================================================================

function generateId(): string {
  return `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function normalizeColumnName(name: string): string {
  let col = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");

  // Map common aliases to canonical names.
  // Order matters -- more specific patterns go first to avoid partial re-matching.
  const rules: [RegExp, string][] = [
    [/^dateofbirth$|^birthdate$|^dob$/, "dob"],
    [/^firstname$/, "firstname"],
    [/^lastname$/, "lastname"],
    [/^emailaddress$|^email$/, "email"],
    [/^phonenumber$|^telephone$|^phone$/, "phone"],
    [/^zip$|^zipcode$|^postalcode$/, "zipcode"],
    [/^gender$|^sex$/, "sex"],
    [/^primarycondition$|^primaryconditions$/, "conditions"],
    [/^medicalconditions?$|^condition$|^conditions$|^diagnosis$|^diagnoses$/, "conditions"],
    [/^currentmedications?$|^medications?$|^meds$/, "medications"],
  ];

  for (const [pattern, replacement] of rules) {
    if (pattern.test(col)) {
      col = replacement;
      break;
    }
  }

  return col;
}

function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map(normalizeColumnName);

  const mappings: { pattern: RegExp; field: keyof ColumnMapping }[] = [
    { pattern: /^firstname$/, field: "firstName" },
    { pattern: /^lastname$/, field: "lastName" },
    { pattern: /^email$/, field: "email" },
    { pattern: /^phone$/, field: "phone" },
    { pattern: /^dob$/, field: "dob" },
    { pattern: /^age$/, field: "age" },
    { pattern: /^sex$/, field: "sex" },
    { pattern: /^location$/, field: "location" },
    { pattern: /^address$/, field: "address" },
    { pattern: /^city$/, field: "city" },
    { pattern: /^state$/, field: "state" },
    { pattern: /^zipcode$/, field: "zipcode" },
    { pattern: /^country$/, field: "country" },
    { pattern: /^conditions$/, field: "conditions" },
    { pattern: /^medications$/, field: "medications" },
    { pattern: /^allergies$/, field: "allergies" },
    { pattern: /^race$/, field: "race" },
    { pattern: /^language$/, field: "language" },
    { pattern: /^diagnosisyear$|^diagnosis_?year$|^yearofdiagnosis$/, field: "diagnosisYear" },
    { pattern: /^diseasestage$|^disease_?stage$|^stage$/, field: "diseaseStage" },
    { pattern: /^ecog$|^ecogscore$|^ecog_?score$|^performancestatus$/, field: "ecog" },
    { pattern: /^biomarkers?$/, field: "biomarkers" },
    { pattern: /^priortherapies$|^prior_?therapies$|^previoustreatments?$/, field: "priorTherapies" },
    { pattern: /^comorbidities$|^comorbidity$/, field: "comorbidities" },
    { pattern: /^notes?$/, field: "notes" },
  ];

  normalizedHeaders.forEach((normalized, index) => {
    const originalHeader = headers[index];
    for (const { pattern, field } of mappings) {
      if (pattern.test(normalized) && !mapping[field]) {
        mapping[field] = originalHeader;
        break;
      }
    }
  });

  return mapping;
}

function parseRow(row: Record<string, unknown>, mapping: ColumnMapping, source: string): CustomPatient | null {
  const getValue = (field: keyof ColumnMapping): string | undefined => {
    const column = mapping[field];
    if (!column) return undefined;
    const value = row[column];
    if (value === null || value === undefined) return undefined;
    return String(value).trim() || undefined;
  };

  const getArrayValue = (field: keyof ColumnMapping): string[] | undefined => {
    const value = getValue(field);
    if (!value) return undefined;
    return value
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const firstName = getValue("firstName");
  const lastName = getValue("lastName");

  // Skip rows without required name fields
  if (!firstName && !lastName) {
    return null;
  }

  const dobStr = getValue("dob");
  let age = getValue("age") ? parseInt(getValue("age")!, 10) : undefined;

  // Calculate age from DOB if not provided
  if (!age && dobStr) {
    try {
      const dob = new Date(dobStr);
      if (!isNaN(dob.getTime())) {
        age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }
    } catch {
      // Ignore date parsing errors
    }
  }

  // Convert raw row to string values for storage
  const rawRow: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    rawRow[key] = value;
  }

  return {
    id: generateId(),
    firstName: firstName || "",
    lastName: lastName || "",
    email: getValue("email"),
    phone: getValue("phone"),
    dob: dobStr,
    age,
    sex: getValue("sex"),
    gender: getValue("sex"), // alias
    race: getValue("race"),
    language: getValue("language"),
    location: getValue("location"),
    address: getValue("address"),
    city: getValue("city"),
    state: getValue("state"),
    zipcode: getValue("zipcode"),
    country: getValue("country"),
    conditions: getArrayValue("conditions"),
    medications: getArrayValue("medications"),
    allergies: getArrayValue("allergies"),
    diagnosisYear: getValue("diagnosisYear"),
    diseaseStage: getValue("diseaseStage"),
    ecog: getValue("ecog"),
    biomarkers: getArrayValue("biomarkers"),
    priorTherapies: getArrayValue("priorTherapies"),
    comorbidities: getArrayValue("comorbidities"),
    notes: getValue("notes"),
    source,
    importedAt: new Date().toISOString(),
    _raw: rawRow,
  };
}

export function parseCSV(content: string, fileName: string, customMapping?: ColumnMapping): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const patients: CustomPatient[] = [];
  const rawData: Record<string, unknown>[] = [];

  try {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      return { ok: false, errors: ["File is empty"] };
    }

    // Parse header
    const headers = parseCSVLine(lines[0]);
    const mapping = customMapping || autoMapColumns(headers);

    if (!mapping.firstName && !mapping.lastName) {
      warnings.push("Could not detect name columns. Please verify column mapping.");
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || "";
        });
        rawData.push(row);

        const patient = parseRow(row, mapping, fileName);
        if (patient) {
          patients.push(patient);
        } else {
          warnings.push(`Row ${i + 1}: Skipped - missing required name fields`);
        }
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Parse error"}`);
      }
    }

    return {
      ok: true,
      patients,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      rowCount: lines.length - 1,
      validCount: patients.length,
      columns: headers,
      rawData,
    };
  } catch (err) {
    return {
      ok: false,
      errors: [`Failed to parse CSV: ${err instanceof Error ? err.message : "Unknown error"}`],
    };
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());

  return result;
}

export function parseJSON(content: string, fileName: string, customMapping?: ColumnMapping): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const patients: CustomPatient[] = [];

  try {
    const data = JSON.parse(content);
    let rows: Record<string, unknown>[];

    // Handle different JSON structures
    if (Array.isArray(data)) {
      rows = data;
    } else if (data.patients && Array.isArray(data.patients)) {
      rows = data.patients;
    } else if (data.data && Array.isArray(data.data)) {
      rows = data.data;
    } else if (data.records && Array.isArray(data.records)) {
      rows = data.records;
    } else {
      return { ok: false, errors: ["Invalid JSON structure. Expected an array or object with patients/data/records array."] };
    }

    if (rows.length === 0) {
      return { ok: false, errors: ["No patient records found in JSON"] };
    }

    // Get all unique headers from all rows (JSON may have varying fields)
    const headerSet = new Set<string>();
    rows.forEach(row => Object.keys(row).forEach(key => headerSet.add(key)));
    const headers = Array.from(headerSet);
    const mapping = customMapping || autoMapColumns(headers);

    for (let i = 0; i < rows.length; i++) {
      try {
        const patient = parseRow(rows[i], mapping, fileName);
        if (patient) {
          patients.push(patient);
        } else {
          warnings.push(`Record ${i + 1}: Skipped - missing required name fields`);
        }
      } catch (err) {
        errors.push(`Record ${i + 1}: ${err instanceof Error ? err.message : "Parse error"}`);
      }
    }

    return {
      ok: true,
      patients,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      rowCount: rows.length,
      validCount: patients.length,
      columns: headers,
      rawData: rows,
    };
  } catch (err) {
    return {
      ok: false,
      errors: [`Failed to parse JSON: ${err instanceof Error ? err.message : "Unknown error"}`],
    };
  }
}

export async function parseExcel(file: File, customMapping?: ColumnMapping): Promise<ParseResult> {
  // We'll use SheetJS (xlsx) library for Excel parsing
  try {
    // Dynamic import of xlsx library
    const XLSX = await import("xlsx");

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { ok: false, errors: ["No sheets found in Excel file"] };
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (rows.length === 0) {
      return { ok: false, errors: ["No data found in Excel sheet"] };
    }

    // Get all unique headers from all rows
    const headerSet = new Set<string>();
    rows.forEach(row => Object.keys(row).forEach(key => headerSet.add(key)));
    const headers = Array.from(headerSet);
    const mapping = customMapping || autoMapColumns(headers);

    const errors: string[] = [];
    const warnings: string[] = [];
    const patients: CustomPatient[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const patient = parseRow(rows[i], mapping, file.name);
        if (patient) {
          patients.push(patient);
        } else {
          warnings.push(`Row ${i + 2}: Skipped - missing required name fields`);
        }
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Parse error"}`);
      }
    }

    return {
      ok: true,
      patients,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      rowCount: rows.length,
      validCount: patients.length,
      columns: headers,
      rawData: rows,
    };
  } catch (err) {
    return {
      ok: false,
      errors: [`Failed to parse Excel: ${err instanceof Error ? err.message : "Unknown error"}`],
    };
  }
}

// ============================================================================
// Trial Matching - COMPREHENSIVE ALGORITHM
// ============================================================================

export interface TrialMatchCriteria {
  minAge?: number;
  maxAge?: number;
  gender?: string;
  // Inclusion criteria - having these is GOOD
  requiredConditions?: string[];
  preferredMedications?: string[];
  preferredLocations?: string[];
  // Exclusion criteria - having these is BAD
  excludedMedications?: string[];
  excludedAllergies?: string[];
  excludedConditions?: string[];
  // Keywords to search in notes
  inclusionKeywords?: string[];
  exclusionKeywords?: string[];
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[\s,;|]+/).filter(Boolean);
}

function fuzzyMatch(a: string, b: string): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  // Direct contains
  if (aLower.includes(bLower) || bLower.includes(aLower)) return true;
  // Token overlap (for multi-word conditions like "Type 2 Diabetes")
  const aTokens = tokenize(aLower);
  const bTokens = tokenize(bLower);
  const overlap = aTokens.filter(t => bTokens.some(bt => bt.includes(t) || t.includes(bt)));
  return overlap.length >= Math.min(aTokens.length, bTokens.length) * 0.5;
}

export function matchPatientsToTrial(
  patients: CustomPatient[],
  trialConditions: string[],
  criteria?: TrialMatchCriteria
): CustomTrialMatch[] {
  const matches: CustomTrialMatch[] = [];
  const conditionsLower = trialConditions.map((c) => c.toLowerCase());
  const requiredConditionsLower = (criteria?.requiredConditions || trialConditions).map(c => c.toLowerCase());

  for (const patient of patients) {
    const matchReasons: string[] = [];
    const exclusionReasons: string[] = [];
    let score = 0;
    let excluded = false;

    // ========================================================================
    // EXCLUSION CHECKS (run first - if excluded, skip this patient)
    // ========================================================================

    // Check excluded medications (e.g., contraindicated drugs)
    if (criteria?.excludedMedications && patient.medications) {
      const patientMedsLower = patient.medications.map(m => m.toLowerCase());
      for (const excludedMed of criteria.excludedMedications) {
        const excludedLower = excludedMed.toLowerCase();
        for (const patientMed of patientMedsLower) {
          if (fuzzyMatch(patientMed, excludedLower)) {
            excluded = true;
            exclusionReasons.push(`Excluded medication: ${patientMed}`);
            break;
          }
        }
        if (excluded) break;
      }
    }

    // Check excluded allergies (e.g., allergic to trial drug)
    if (!excluded && criteria?.excludedAllergies && patient.allergies) {
      const patientAllergiesLower = patient.allergies.map(a => a.toLowerCase());
      for (const excludedAllergy of criteria.excludedAllergies) {
        const excludedLower = excludedAllergy.toLowerCase();
        for (const patientAllergy of patientAllergiesLower) {
          if (fuzzyMatch(patientAllergy, excludedLower)) {
            excluded = true;
            exclusionReasons.push(`Excluded allergy: ${patientAllergy}`);
            break;
          }
        }
        if (excluded) break;
      }
    }

    // Check excluded conditions (e.g., comorbidities that disqualify)
    if (!excluded && criteria?.excludedConditions && patient.conditions) {
      const patientConditionsLower = patient.conditions.map(c => c.toLowerCase());
      for (const excludedCond of criteria.excludedConditions) {
        const excludedLower = excludedCond.toLowerCase();
        for (const patientCond of patientConditionsLower) {
          if (fuzzyMatch(patientCond, excludedLower)) {
            excluded = true;
            exclusionReasons.push(`Excluded condition: ${patientCond}`);
            break;
          }
        }
        if (excluded) break;
      }
    }

    // Check exclusion keywords in notes
    if (!excluded && criteria?.exclusionKeywords && patient.notes) {
      const notesLower = patient.notes.toLowerCase();
      for (const keyword of criteria.exclusionKeywords) {
        if (notesLower.includes(keyword.toLowerCase())) {
          excluded = true;
          exclusionReasons.push(`Excluded by notes: contains "${keyword}"`);
          break;
        }
      }
    }

    // Skip this patient if excluded
    if (excluded) {
      continue;
    }

    // ========================================================================
    // INCLUSION SCORING (higher = better match)
    // ========================================================================

    // PRIMARY: Condition match (up to 35 points)
    if (patient.conditions && patient.conditions.length > 0) {
      const patientConditionsLower = patient.conditions.map((c) => c.toLowerCase());
      let conditionMatches = 0;
      for (const condition of conditionsLower) {
        for (const patientCondition of patientConditionsLower) {
          if (fuzzyMatch(patientCondition, condition)) {
            conditionMatches++;
            matchReasons.push(`Condition match: ${patientCondition}`);
            break;
          }
        }
      }
      // Score based on how many trial conditions match
      if (conditionMatches > 0) {
        const conditionScore = Math.min(35, conditionMatches * 15);
        score += conditionScore;
      }
    }

    // SECONDARY: Age criteria (up to 20 points)
    if (patient.age !== undefined) {
      let ageMatch = true;
      if (criteria?.minAge && patient.age < criteria.minAge) {
        ageMatch = false;
      }
      if (criteria?.maxAge && patient.age > criteria.maxAge) {
        ageMatch = false;
      }
      if (ageMatch) {
        score += 20;
        matchReasons.push(`Age ${patient.age} within range${criteria?.minAge || criteria?.maxAge ? ` (${criteria?.minAge || '?'}-${criteria?.maxAge || '?'})` : ''}`);
      }
    } else {
      // Unknown age - partial credit
      score += 5;
      matchReasons.push("Age unknown (partial match)");
    }

    // SECONDARY: Gender criteria (up to 10 points)
    if (criteria?.gender && patient.sex) {
      const genderMatch =
        criteria.gender.toLowerCase() === "all" ||
        patient.sex.toLowerCase().startsWith(criteria.gender.toLowerCase()[0]);
      if (genderMatch) {
        score += 10;
        matchReasons.push(`Gender matches: ${patient.sex}`);
      }
    } else if (!criteria?.gender) {
      // No gender requirement
      score += 10;
    }

    // TERTIARY: Medications match (up to 15 points)
    if (criteria?.preferredMedications && patient.medications) {
      const patientMedsLower = patient.medications.map(m => m.toLowerCase());
      let medMatches = 0;
      for (const preferredMed of criteria.preferredMedications) {
        const preferredLower = preferredMed.toLowerCase();
        for (const patientMed of patientMedsLower) {
          if (fuzzyMatch(patientMed, preferredLower)) {
            medMatches++;
            matchReasons.push(`Current medication: ${patientMed}`);
            break;
          }
        }
      }
      if (medMatches > 0) {
        score += Math.min(15, medMatches * 5);
      }
    }

    // TERTIARY: Location match (up to 10 points)
    if (criteria?.preferredLocations && (patient.city || patient.state || patient.zipcode)) {
      const patientLocation = [patient.city, patient.state, patient.zipcode].filter(Boolean).join(" ").toLowerCase();
      for (const preferredLoc of criteria.preferredLocations) {
        if (patientLocation.includes(preferredLoc.toLowerCase()) ||
            preferredLoc.toLowerCase().includes(patientLocation)) {
          score += 10;
          matchReasons.push(`Location match: ${patient.city || ''} ${patient.state || ''}`);
          break;
        }
      }
    }

    // TERTIARY: Inclusion keywords in notes (up to 10 points)
    if (criteria?.inclusionKeywords && patient.notes) {
      const notesLower = patient.notes.toLowerCase();
      let keywordMatches = 0;
      for (const keyword of criteria.inclusionKeywords) {
        if (notesLower.includes(keyword.toLowerCase())) {
          keywordMatches++;
          matchReasons.push(`Notes mention: "${keyword}"`);
        }
      }
      if (keywordMatches > 0) {
        score += Math.min(10, keywordMatches * 3);
      }
    }

    // BONUS: Allergies documented (shows complete medical history) - 5 points
    if (patient.allergies && patient.allergies.length > 0) {
      score += 5;
      matchReasons.push(`Allergies documented: ${patient.allergies.join(", ")}`);
    }

    // BONUS: Complete contact info - 5 points
    if (patient.email && patient.phone) {
      score += 5;
      matchReasons.push("Complete contact information");
    }

    // Add to matches if score > 0
    if (score > 0) {
      matches.push({
        patientId: patient.id,
        patient,
        nctId: "", // Will be set by caller
        matchScore: Math.min(score, 100),
        matchReasons,
        eligibilityStatus: "potential",
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

// ============================================================================
// Match Management (API-first with localStorage fallback)
// ============================================================================

export async function getMatchesAsync(userId: string, nctId?: string): Promise<CustomTrialMatch[]> {
  const params: Record<string, string> = {};
  if (nctId) params.nctId = nctId;

  const result = await apiRequest<{ matches: CustomTrialMatch[] }>("/matches", { params });
  if (result.ok && result.data?.matches) {
    // Cache in localStorage
    if (!nctId) {
      localStorage.setItem(STORAGE_KEYS.matches(userId), JSON.stringify(result.data.matches));
    }
    return result.data.matches;
  }
  // Fallback to localStorage
  const matches = getMatches(userId);
  return nctId ? matches.filter((m) => m.nctId === nctId) : matches;
}

export function getMatches(userId: string): CustomTrialMatch[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.matches(userId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function saveMatchesAsync(userId: string, matches: CustomTrialMatch[]): Promise<boolean> {
  const result = await apiRequest("/matches", {
    method: "POST",
    body: { matches },
  });
  // Always save to localStorage as cache
  saveMatches(userId, matches);
  return result.ok;
}

export function saveMatches(userId: string, matches: CustomTrialMatch[]): void {
  localStorage.setItem(STORAGE_KEYS.matches(userId), JSON.stringify(matches));
}

export async function updateMatchStatusAsync(
  userId: string,
  patientId: string,
  nctId: string,
  status: CustomTrialMatch["eligibilityStatus"],
  notes?: string
): Promise<boolean> {
  const result = await apiRequest("/matches", {
    method: "PUT",
    body: { patientId, nctId, status, notes },
  });
  // Always update localStorage
  updateMatchStatus(userId, patientId, nctId, status, notes);
  return result.ok;
}

export function updateMatchStatus(
  userId: string,
  patientId: string,
  nctId: string,
  status: CustomTrialMatch["eligibilityStatus"],
  notes?: string
): void {
  const matches = getMatches(userId);
  const index = matches.findIndex((m) => m.patientId === patientId && m.nctId === nctId);

  if (index >= 0) {
    matches[index] = {
      ...matches[index],
      eligibilityStatus: status,
      notes: notes || matches[index].notes,
      updatedAt: new Date().toISOString(),
    };
    saveMatches(userId, matches);
  }
}

export function getMatchesForTrial(userId: string, nctId: string): CustomTrialMatch[] {
  return getMatches(userId).filter((m) => m.nctId === nctId);
}

// ============================================================================
// Helper Functions
// ============================================================================

export function formatPatientName(patient: CustomPatient): string {
  return `${patient.firstName} ${patient.lastName}`.trim() || "Unknown";
}

export function calculateAge(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export function formatMatchScore(score: number): string {
  return `${Math.min(Math.round(score), 100)}%`;
}

export function getStatusColor(status: CustomTrialMatch["eligibilityStatus"]): string {
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

export function getStatusLabel(status: CustomTrialMatch["eligibilityStatus"]): string {
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
