/**
 * Custom Patient Database API
 *
 * Stores custom patient databases, patients, and trial matches in PostgreSQL
 * instead of localStorage for proper cloud persistence.
 */

import { Handler, HandlerEvent } from "@netlify/functions";
import * as cors from "./cors-utils";
import { query, initializeDatabase } from "./db";
import { verifyTokenAndGetUser } from "./auth-utils";
import { verifyCsrfToken } from "./csrf-utils";

// ============================================================================
// Types
// ============================================================================

interface CustomPatient {
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
  source: string;
  importedAt: string;
}

interface CustomPatientDatabase {
  id: string;
  name: string;
  description?: string;
  patientCount: number;
  createdAt: string;
  updatedAt: string;
  source: "csv" | "excel" | "json" | "manual";
  fileName?: string;
}

interface CustomTrialMatch {
  patientId: string;
  patient: CustomPatient;
  nctId: string;
  matchScore: number;
  matchReasons: string[];
  eligibilityStatus: "potential" | "eligible" | "ineligible" | "contacted" | "enrolled";
  notes?: string;
  updatedAt: string;
}

// ============================================================================
// Database Schema
// ============================================================================

async function ensureTablesExist(): Promise<void> {
  await initializeDatabase();

  // Custom patient databases table
  await query(`
    CREATE TABLE IF NOT EXISTS custom_patient_databases (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      patient_count INTEGER DEFAULT 0,
      source VARCHAR(50) NOT NULL,
      file_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Custom patients table (stores patient data as JSONB for flexibility)
  await query(`
    CREATE TABLE IF NOT EXISTS custom_patients (
      id VARCHAR(255) PRIMARY KEY,
      database_id VARCHAR(255) NOT NULL REFERENCES custom_patient_databases(id) ON DELETE CASCADE,
      user_id VARCHAR(255) NOT NULL,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      dob DATE,
      age INTEGER,
      sex VARCHAR(20),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(50),
      zipcode VARCHAR(20),
      country VARCHAR(100),
      conditions JSONB DEFAULT '[]',
      medications JSONB DEFAULT '[]',
      allergies JSONB DEFAULT '[]',
      notes TEXT,
      source VARCHAR(255),
      imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Custom trial matches table
  await query(`
    CREATE TABLE IF NOT EXISTS custom_trial_matches (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      patient_id VARCHAR(255) NOT NULL,
      nct_id VARCHAR(50) NOT NULL,
      match_score INTEGER DEFAULT 0,
      match_reasons JSONB DEFAULT '[]',
      eligibility_status VARCHAR(50) DEFAULT 'potential',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, patient_id, nct_id)
    )
  `);

  // Create indexes for performance
  await query(`CREATE INDEX IF NOT EXISTS idx_custom_patients_database_id ON custom_patients(database_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_custom_patients_user_id ON custom_patients(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_custom_trial_matches_user_id ON custom_trial_matches(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_custom_trial_matches_nct_id ON custom_trial_matches(nct_id)`);
}

// ============================================================================
// Handler
// ============================================================================

export const handler: Handler = async (event: HandlerEvent) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return cors.response(204, "");
  }

  try {
    await ensureTablesExist();

    // Verify authentication
    const user = await verifyTokenAndGetUser(event);
    if (!user) {
      return cors.response(401, { error: "Unauthorized" });
    }

    const path = event.path.replace("/.netlify/functions/custom-patients", "").replace("/api/custom-patients", "");
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    // CSRF verification for state-changing operations
    if (["POST", "PUT", "DELETE"].includes(method)) {
      const csrfToken = event.headers["x-csrf-token"];
      if (!csrfToken || !verifyCsrfToken(csrfToken)) {
        return cors.response(403, { error: "Invalid CSRF token" });
      }
    }

    // Route handling
    if (path === "/databases" || path === "") {
      if (method === "GET") {
        return await getDatabases(user.userId);
      } else if (method === "POST") {
        return await createDatabase(user.userId, body);
      }
    }

    if (path.startsWith("/databases/") && method === "DELETE") {
      const dbId = path.replace("/databases/", "");
      return await deleteDatabase(user.userId, dbId);
    }

    if (path === "/patients" || path === "/patients/") {
      if (method === "GET") {
        const dbId = event.queryStringParameters?.databaseId;
        return await getPatients(user.userId, dbId);
      } else if (method === "POST") {
        return await savePatients(user.userId, body.databaseId, body.patients);
      }
    }

    if (path === "/matches" || path === "/matches/") {
      if (method === "GET") {
        const nctId = event.queryStringParameters?.nctId;
        return await getMatches(user.userId, nctId);
      } else if (method === "POST") {
        return await saveMatches(user.userId, body.matches);
      } else if (method === "PUT") {
        return await updateMatchStatus(user.userId, body);
      }
    }

    return cors.response(404, { error: "Not found" });
  } catch (error) {
    console.error("Custom patients API error:", error);
    return cors.response(500, { error: error instanceof Error ? error.message : "Internal server error" });
  }
};

// ============================================================================
// Database Operations
// ============================================================================

async function getDatabases(userId: string) {
  const result = await query(
    `SELECT id, name, description, patient_count, source, file_name, created_at, updated_at
     FROM custom_patient_databases
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  const databases: CustomPatientDatabase[] = result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    patientCount: row.patient_count,
    source: row.source,
    fileName: row.file_name,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));

  return cors.response(200, { databases });
}

async function createDatabase(userId: string, db: CustomPatientDatabase) {
  await query(
    `INSERT INTO custom_patient_databases (id, user_id, name, description, patient_count, source, file_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       patient_count = EXCLUDED.patient_count,
       updated_at = CURRENT_TIMESTAMP`,
    [db.id, userId, db.name, db.description || null, db.patientCount, db.source, db.fileName || null]
  );

  return cors.response(200, { ok: true, id: db.id });
}

async function deleteDatabase(userId: string, dbId: string) {
  // Delete database (patients will cascade delete)
  await query(
    `DELETE FROM custom_patient_databases WHERE id = $1 AND user_id = $2`,
    [dbId, userId]
  );

  // Also delete matches for patients in this database
  await query(
    `DELETE FROM custom_trial_matches
     WHERE user_id = $1 AND patient_id IN (
       SELECT id FROM custom_patients WHERE database_id = $2
     )`,
    [userId, dbId]
  );

  return cors.response(200, { ok: true });
}

// ============================================================================
// Patient Operations
// ============================================================================

async function getPatients(userId: string, databaseId?: string) {
  let sql = `
    SELECT id, database_id, first_name, last_name, email, phone, dob, age, sex,
           address, city, state, zipcode, country, conditions, medications, allergies,
           notes, source, imported_at
    FROM custom_patients
    WHERE user_id = $1
  `;
  const params: any[] = [userId];

  if (databaseId) {
    sql += ` AND database_id = $2`;
    params.push(databaseId);
  }

  sql += ` ORDER BY imported_at DESC`;

  const result = await query(sql, params);

  const patients: CustomPatient[] = result.rows.map((row: any) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    dob: row.dob ? row.dob.toISOString().split('T')[0] : undefined,
    age: row.age,
    sex: row.sex,
    gender: row.sex,
    address: row.address,
    city: row.city,
    state: row.state,
    zipcode: row.zipcode,
    country: row.country,
    conditions: row.conditions || [],
    medications: row.medications || [],
    allergies: row.allergies || [],
    notes: row.notes,
    source: row.source,
    importedAt: row.imported_at.toISOString(),
  }));

  return cors.response(200, { patients });
}

async function savePatients(userId: string, databaseId: string, patients: CustomPatient[]) {
  if (!databaseId || !patients || !Array.isArray(patients)) {
    return cors.response(400, { error: "Missing databaseId or patients array" });
  }

  // Batch insert patients
  for (const patient of patients) {
    await query(
      `INSERT INTO custom_patients (
        id, database_id, user_id, first_name, last_name, email, phone, dob, age, sex,
        address, city, state, zipcode, country, conditions, medications, allergies, notes, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        dob = EXCLUDED.dob,
        age = EXCLUDED.age,
        sex = EXCLUDED.sex,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zipcode = EXCLUDED.zipcode,
        country = EXCLUDED.country,
        conditions = EXCLUDED.conditions,
        medications = EXCLUDED.medications,
        allergies = EXCLUDED.allergies,
        notes = EXCLUDED.notes`,
      [
        patient.id,
        databaseId,
        userId,
        patient.firstName,
        patient.lastName,
        patient.email || null,
        patient.phone || null,
        patient.dob || null,
        patient.age || null,
        patient.sex || null,
        patient.address || null,
        patient.city || null,
        patient.state || null,
        patient.zipcode || null,
        patient.country || null,
        JSON.stringify(patient.conditions || []),
        JSON.stringify(patient.medications || []),
        JSON.stringify(patient.allergies || []),
        patient.notes || null,
        patient.source,
      ]
    );
  }

  // Update patient count
  await query(
    `UPDATE custom_patient_databases SET patient_count = (
      SELECT COUNT(*) FROM custom_patients WHERE database_id = $1
    ), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [databaseId]
  );

  return cors.response(200, { ok: true, count: patients.length });
}

// ============================================================================
// Match Operations
// ============================================================================

async function getMatches(userId: string, nctId?: string) {
  let sql = `
    SELECT m.patient_id, m.nct_id, m.match_score, m.match_reasons, m.eligibility_status, m.notes, m.updated_at,
           p.id, p.first_name, p.last_name, p.email, p.phone, p.dob, p.age, p.sex,
           p.city, p.state, p.conditions, p.medications, p.allergies, p.notes as patient_notes
    FROM custom_trial_matches m
    JOIN custom_patients p ON m.patient_id = p.id
    WHERE m.user_id = $1
  `;
  const params: any[] = [userId];

  if (nctId) {
    sql += ` AND m.nct_id = $2`;
    params.push(nctId);
  }

  sql += ` ORDER BY m.match_score DESC`;

  const result = await query(sql, params);

  const matches: CustomTrialMatch[] = result.rows.map((row: any) => ({
    patientId: row.patient_id,
    nctId: row.nct_id,
    matchScore: row.match_score,
    matchReasons: row.match_reasons || [],
    eligibilityStatus: row.eligibility_status,
    notes: row.notes,
    updatedAt: row.updated_at.toISOString(),
    patient: {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      dob: row.dob ? row.dob.toISOString().split('T')[0] : undefined,
      age: row.age,
      sex: row.sex,
      city: row.city,
      state: row.state,
      conditions: row.conditions || [],
      medications: row.medications || [],
      allergies: row.allergies || [],
      notes: row.patient_notes,
      source: "",
      importedAt: "",
    },
  }));

  return cors.response(200, { matches });
}

async function saveMatches(userId: string, matches: CustomTrialMatch[]) {
  if (!matches || !Array.isArray(matches)) {
    return cors.response(400, { error: "Missing matches array" });
  }

  for (const match of matches) {
    await query(
      `INSERT INTO custom_trial_matches (user_id, patient_id, nct_id, match_score, match_reasons, eligibility_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, patient_id, nct_id) DO UPDATE SET
         match_score = EXCLUDED.match_score,
         match_reasons = EXCLUDED.match_reasons,
         eligibility_status = EXCLUDED.eligibility_status,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        match.patientId,
        match.nctId,
        match.matchScore,
        JSON.stringify(match.matchReasons || []),
        match.eligibilityStatus,
        match.notes || null,
      ]
    );
  }

  return cors.response(200, { ok: true, count: matches.length });
}

async function updateMatchStatus(userId: string, body: { patientId: string; nctId: string; status: string; notes?: string }) {
  const { patientId, nctId, status, notes } = body;

  if (!patientId || !nctId || !status) {
    return cors.response(400, { error: "Missing required fields" });
  }

  await query(
    `UPDATE custom_trial_matches
     SET eligibility_status = $1, notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $3 AND patient_id = $4 AND nct_id = $5`,
    [status, notes || null, userId, patientId, nctId]
  );

  return cors.response(200, { ok: true });
}
