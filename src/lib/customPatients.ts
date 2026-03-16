/**
 * Custom Patient Database Management
 *
 * Handles uploading, storing, and matching custom patient data
 * from CSV, Excel, and JSON files. Separate from Elation EHR integration.
 */

import { getCsrfToken } from "./csrf";

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
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  conditions?: string[];
  medications?: string[];
  allergies?: string[];
  notes?: string;
  source: string; // filename or "manual"
  importedAt: string;
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
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  conditions?: string;
  medications?: string;
  allergies?: string;
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
// Database Management
// ============================================================================

export function getDatabases(userId: string): CustomPatientDatabase[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.databases(userId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
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

export function deleteDatabase(userId: string, dbId: string): void {
  const databases = getDatabases(userId).filter((d) => d.id !== dbId);
  localStorage.setItem(STORAGE_KEYS.databases(userId), JSON.stringify(databases));
  localStorage.removeItem(STORAGE_KEYS.patients(userId, dbId));
}

// ============================================================================
// Patient Management
// ============================================================================

export function getPatients(userId: string, dbId: string): CustomPatient[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.patients(userId, dbId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function getAllPatients(userId: string): CustomPatient[] {
  const databases = getDatabases(userId);
  return databases.flatMap((db) => getPatients(userId, db.id));
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
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .replace(/date_?of_?birth|birthdate|birth_?date|dateofbirth/g, "dob")
    .replace(/firstname|first_?name/g, "firstname")
    .replace(/lastname|last_?name/g, "lastname")
    .replace(/email_?address|emailaddress/g, "email")
    .replace(/phone_?number|phonenumber|telephone/g, "phone")
    .replace(/zipcode|zip_?code|postal_?code|postalcode/g, "zipcode")
    .replace(/gender|sex/g, "sex")
    .replace(/medical_?conditions|condition|diagnosis|diagnoses/g, "conditions")
    .replace(/current_?medications|medication|meds/g, "medications");
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

  return {
    id: generateId(),
    firstName: firstName || "",
    lastName: lastName || "",
    email: getValue("email"),
    phone: getValue("phone"),
    dob: dobStr,
    age,
    sex: getValue("sex"),
    gender: getValue("sex"), // Alias
    location: getValue("location"),
    address: getValue("address"),
    city: getValue("city"),
    state: getValue("state"),
    zipcode: getValue("zipcode"),
    country: getValue("country"),
    conditions: getArrayValue("conditions"),
    medications: getArrayValue("medications"),
    allergies: getArrayValue("allergies"),
    notes: getValue("notes"),
    source,
    importedAt: new Date().toISOString(),
  };
}

export function parseCSV(content: string, fileName: string, customMapping?: ColumnMapping): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const patients: CustomPatient[] = [];

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

    // Get headers from first row
    const headers = Object.keys(rows[0]);
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
  // For now, return an error until we add the library
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

    const headers = Object.keys(rows[0]);
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
    };
  } catch (err) {
    return {
      ok: false,
      errors: [`Failed to parse Excel: ${err instanceof Error ? err.message : "Unknown error"}`],
    };
  }
}

// ============================================================================
// Trial Matching
// ============================================================================

export function matchPatientsToTrial(
  patients: CustomPatient[],
  trialConditions: string[],
  criteria?: {
    minAge?: number;
    maxAge?: number;
    gender?: string;
  }
): CustomTrialMatch[] {
  const matches: CustomTrialMatch[] = [];
  const conditionsLower = trialConditions.map((c) => c.toLowerCase());

  for (const patient of patients) {
    const matchReasons: string[] = [];
    let score = 0;

    // Check conditions match
    if (patient.conditions && patient.conditions.length > 0) {
      const patientConditionsLower = patient.conditions.map((c) => c.toLowerCase());
      for (const condition of conditionsLower) {
        for (const patientCondition of patientConditionsLower) {
          if (
            patientCondition.includes(condition) ||
            condition.includes(patientCondition)
          ) {
            score += 40;
            matchReasons.push(`Condition match: ${patientCondition}`);
            break;
          }
        }
      }
    }

    // Check age criteria
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
        matchReasons.push(`Age (${patient.age}) within range`);
      }
    }

    // Check gender criteria
    if (criteria?.gender && patient.sex) {
      const genderMatch =
        criteria.gender.toLowerCase() === "all" ||
        patient.sex.toLowerCase().startsWith(criteria.gender.toLowerCase()[0]);
      if (genderMatch) {
        score += 10;
        matchReasons.push(`Gender matches (${patient.sex})`);
      }
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
// Match Management
// ============================================================================

export function getMatches(userId: string): CustomTrialMatch[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.matches(userId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveMatches(userId: string, matches: CustomTrialMatch[]): void {
  localStorage.setItem(STORAGE_KEYS.matches(userId), JSON.stringify(matches));
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
