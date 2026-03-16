/**
 * Elation Health EHR Integration API
 *
 * Handles OAuth flow and patient data sync from Elation Health.
 * Credentials are stored server-side only.
 *
 * Environment variables required:
 * - ELATION_API_KEY
 * - ELATION_CLIENT_ID
 * - ELATION_CLIENT_SECRET
 * - ELATION_API_BASE_URL (default: https://api.elationhealth.com/api/2.0)
 */

import type { Handler } from "@netlify/functions";
import { query, logAuditEvent } from "./db";
import { createCorsHandler } from "./cors-utils";
import { validateCsrfToken, getCsrfTokenFromHeaders } from "./csrf-utils";

// ============================================================================
// Configuration
// ============================================================================

const ELATION_API_BASE = process.env.ELATION_API_BASE_URL || "https://api.elationhealth.com/api/2.0";
const ELATION_CLIENT_ID = process.env.ELATION_CLIENT_ID || "";
const ELATION_CLIENT_SECRET = process.env.ELATION_CLIENT_SECRET || "";
const ELATION_API_KEY = process.env.ELATION_API_KEY || "";

// ============================================================================
// Types
// ============================================================================

interface ElationTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface ElationPatient {
  id: number;
  first_name: string;
  last_name: string;
  dob: string;
  sex: string;
  email?: string;
  primary_phone?: string;
  address?: {
    address_line1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  practice?: number;
  created_date?: string;
}

interface ElationProblem {
  id: number;
  patient: number;
  icd10_code?: string;
  description: string;
  status: string;
  onset_date?: string;
}

interface ElationAllergy {
  id: number;
  patient: number;
  name: string;
  status: string;
  reaction?: string;
  severity?: string;
}

interface ElationMedication {
  id: number;
  patient: number;
  medication_name: string;
  sig?: string;
  status: string;
}

// ============================================================================
// Database Schema Creation (run once)
// ============================================================================

async function ensureElationTables(): Promise<void> {
  // Table for storing Elation OAuth tokens per provider
  await query(`
    CREATE TABLE IF NOT EXISTS elation_connections (
      id SERIAL PRIMARY KEY,
      provider_id VARCHAR(255) NOT NULL UNIQUE,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMPTZ,
      practice_id INTEGER,
      practice_name VARCHAR(255),
      connected_at TIMESTAMPTZ DEFAULT NOW(),
      last_sync_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Table for cached Elation patients
  await query(`
    CREATE TABLE IF NOT EXISTS elation_patients (
      id SERIAL PRIMARY KEY,
      provider_id VARCHAR(255) NOT NULL,
      elation_patient_id INTEGER NOT NULL,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      dob DATE,
      sex VARCHAR(20),
      email VARCHAR(255),
      phone VARCHAR(50),
      city VARCHAR(255),
      state VARCHAR(50),
      zip VARCHAR(20),
      problems JSONB DEFAULT '[]',
      allergies JSONB DEFAULT '[]',
      medications JSONB DEFAULT '[]',
      vitals JSONB,
      last_synced_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(provider_id, elation_patient_id)
    )
  `);

  // Table for trial-patient matches from Elation data
  await query(`
    CREATE TABLE IF NOT EXISTS elation_trial_matches (
      id SERIAL PRIMARY KEY,
      provider_id VARCHAR(255) NOT NULL,
      elation_patient_id INTEGER NOT NULL,
      nct_id VARCHAR(20) NOT NULL,
      match_score INTEGER,
      match_reasons JSONB DEFAULT '[]',
      eligibility_status VARCHAR(50) DEFAULT 'pending',
      contacted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(provider_id, elation_patient_id, nct_id)
    )
  `);
}

// ============================================================================
// Elation API Helpers
// ============================================================================

async function getAccessToken(providerId: string): Promise<string | null> {
  const result = await query(
    `SELECT access_token, token_expires_at, refresh_token
     FROM elation_connections
     WHERE provider_id = $1`,
    [providerId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const { access_token, token_expires_at, refresh_token } = result.rows[0];

  // Check if token is expired
  if (token_expires_at && new Date(token_expires_at) < new Date()) {
    // Try to refresh
    if (refresh_token) {
      const newToken = await refreshElationToken(providerId, refresh_token);
      return newToken;
    }
    return null;
  }

  return access_token;
}

async function refreshElationToken(providerId: string, refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${ELATION_API_BASE}/oauth2/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: ELATION_CLIENT_ID,
        client_secret: ELATION_CLIENT_SECRET,
      }).toString(),
    });

    if (!response.ok) {
      console.error("Failed to refresh Elation token:", await response.text());
      return null;
    }

    const tokens: ElationTokenResponse = await response.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await query(
      `UPDATE elation_connections
       SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = NOW()
       WHERE provider_id = $4`,
      [tokens.access_token, tokens.refresh_token || refreshToken, expiresAt.toISOString(), providerId]
    );

    return tokens.access_token;
  } catch (err) {
    console.error("Error refreshing Elation token:", err);
    return null;
  }
}

async function fetchFromElation<T>(
  accessToken: string,
  endpoint: string,
  params?: Record<string, string>
): Promise<T | null> {
  try {
    const url = new URL(`${ELATION_API_BASE}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Elation API error (${endpoint}):`, await response.text());
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`Error fetching from Elation (${endpoint}):`, err);
    return null;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

export const handler: Handler = async (event) => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("GET,POST,DELETE,OPTIONS");
  }

  // Ensure tables exist
  try {
    await ensureElationTables();
  } catch (err) {
    console.error("Failed to ensure Elation tables:", err);
  }

  const userId = event.headers["x-user-id"];
  const providerId = event.headers["x-provider-id"] || userId;

  if (!userId) {
    return cors.response(401, { ok: false, error: "Missing x-user-id header" });
  }

  try {
    // ========================================================================
    // GET Actions
    // ========================================================================
    if (event.httpMethod === "GET") {
      const action = event.queryStringParameters?.action;

      // Check connection status
      if (action === "status") {
        const result = await query(
          `SELECT practice_name, last_sync_at, connected_at
           FROM elation_connections
           WHERE provider_id = $1`,
          [providerId]
        );

        if (result.rows.length === 0) {
          return cors.response(200, {
            ok: true,
            connected: false,
            configured: !!ELATION_CLIENT_ID && !!ELATION_CLIENT_SECRET,
          });
        }

        const countResult = await query(
          `SELECT COUNT(*) as count FROM elation_patients WHERE provider_id = $1`,
          [providerId]
        );

        return cors.response(200, {
          ok: true,
          connected: true,
          practiceName: result.rows[0].practice_name,
          lastSync: result.rows[0].last_sync_at,
          connectedAt: result.rows[0].connected_at,
          patientCount: parseInt(countResult.rows[0].count, 10),
        });
      }

      // Get single patient profile
      if (action === "patient") {
        const patientId = event.queryStringParameters?.patientId;
        if (!patientId) {
          return cors.response(400, { ok: false, error: "patientId required" });
        }

        const result = await query(
          `SELECT * FROM elation_patients
           WHERE provider_id = $1 AND elation_patient_id = $2`,
          [providerId, parseInt(patientId, 10)]
        );

        if (result.rows.length === 0) {
          return cors.response(404, { ok: false, error: "Patient not found" });
        }

        const row = result.rows[0];
        return cors.response(200, {
          ok: true,
          profile: {
            patient: {
              id: row.elation_patient_id,
              first_name: row.first_name,
              last_name: row.last_name,
              dob: row.dob,
              sex: row.sex,
              email: row.email,
              primary_phone: row.phone,
              address: { city: row.city, state: row.state, zip: row.zip },
            },
            problems: row.problems || [],
            allergies: row.allergies || [],
            medications: row.medications || [],
            vitals: row.vitals,
          },
        });
      }

      // List synced patients
      if (action === "patients") {
        const limit = parseInt(event.queryStringParameters?.limit || "50", 10);
        const offset = parseInt(event.queryStringParameters?.offset || "0", 10);
        const condition = event.queryStringParameters?.condition;

        let queryStr = `
          SELECT * FROM elation_patients
          WHERE provider_id = $1
        `;
        const params: any[] = [providerId];

        if (condition) {
          queryStr += ` AND problems::text ILIKE $${params.length + 1}`;
          params.push(`%${condition}%`);
        }

        queryStr += ` ORDER BY last_name, first_name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await query(queryStr, params);

        const countResult = await query(
          `SELECT COUNT(*) as count FROM elation_patients WHERE provider_id = $1`,
          [providerId]
        );

        return cors.response(200, {
          ok: true,
          patients: result.rows.map((row) => ({
            id: row.elation_patient_id,
            firstName: row.first_name,
            lastName: row.last_name,
            dob: row.dob,
            sex: row.sex,
            email: row.email,
            phone: row.phone,
            location: row.city ? `${row.city}, ${row.state}` : null,
            problems: row.problems || [],
            allergies: row.allergies || [],
            medications: row.medications || [],
            lastSynced: row.last_synced_at,
          })),
          totalCount: parseInt(countResult.rows[0].count, 10),
          limit,
          offset,
        });
      }

      // Get matches for a trial
      if (action === "matches") {
        const nctId = event.queryStringParameters?.nctId;
        if (!nctId) {
          return cors.response(400, { ok: false, error: "nctId required" });
        }

        const result = await query(
          `SELECT m.*, p.first_name, p.last_name, p.email, p.problems
           FROM elation_trial_matches m
           JOIN elation_patients p ON m.elation_patient_id = p.elation_patient_id AND m.provider_id = p.provider_id
           WHERE m.provider_id = $1 AND m.nct_id = $2
           ORDER BY m.match_score DESC`,
          [providerId, nctId.toUpperCase()]
        );

        return cors.response(200, {
          ok: true,
          matches: result.rows.map((row) => ({
            patientId: row.elation_patient_id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            matchScore: row.match_score,
            matchReasons: row.match_reasons,
            eligibilityStatus: row.eligibility_status,
            contactedAt: row.contacted_at,
            problems: row.problems,
          })),
        });
      }

      return cors.response(400, { ok: false, error: "Invalid action" });
    }

    // ========================================================================
    // POST Actions
    // ========================================================================
    if (event.httpMethod === "POST") {
      const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
      if (!csrfToken || !validateCsrfToken(csrfToken)) {
        return cors.response(403, { error: "Invalid CSRF token" });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const { action } = body;

      // Initiate OAuth flow
      if (action === "initiate_oauth") {
        if (!ELATION_CLIENT_ID) {
          return cors.response(400, {
            ok: false,
            error: "Elation integration not configured. Please set ELATION_CLIENT_ID.",
          });
        }

        const { redirectUri } = body;
        const state = `${providerId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

        // Store state for verification
        await query(
          `INSERT INTO elation_connections (provider_id, access_token)
           VALUES ($1, $2)
           ON CONFLICT (provider_id) DO UPDATE SET updated_at = NOW()`,
          [providerId, `state:${state}`]
        );

        const authUrl = new URL("https://app.elationhealth.com/oauth2/authorize/");
        authUrl.searchParams.set("client_id", ELATION_CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("scope", "read write");

        return cors.response(200, {
          ok: true,
          authUrl: authUrl.toString(),
        });
      }

      // Complete OAuth flow
      if (action === "complete_oauth") {
        const { code, state, redirectUri } = body;

        if (!code || !state) {
          return cors.response(400, { ok: false, error: "Missing code or state" });
        }

        // Exchange code for tokens
        const tokenResponse = await fetch("https://app.elationhealth.com/oauth2/token/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri || "",
            client_id: ELATION_CLIENT_ID,
            client_secret: ELATION_CLIENT_SECRET,
          }).toString(),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          console.error("Elation OAuth error:", error);
          return cors.response(400, { ok: false, error: "OAuth token exchange failed" });
        }

        const tokens: ElationTokenResponse = await tokenResponse.json();
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Store tokens
        await query(
          `UPDATE elation_connections
           SET access_token = $1, refresh_token = $2, token_expires_at = $3, connected_at = NOW(), updated_at = NOW()
           WHERE provider_id = $4`,
          [tokens.access_token, tokens.refresh_token, expiresAt.toISOString(), providerId]
        );

        await logAuditEvent(
          userId,
          "ELATION_CONNECTED",
          "elation_connection",
          providerId,
          undefined,
          {},
          event.headers?.["x-forwarded-for"],
          event.headers?.["user-agent"]
        );

        return cors.response(200, { ok: true, message: "Elation connected successfully" });
      }

      // Sync patients from Elation
      if (action === "sync_patients") {
        const accessToken = await getAccessToken(providerId);
        if (!accessToken) {
          return cors.response(401, { ok: false, error: "Not connected to Elation" });
        }

        const { limit = 100, offset = 0, problemFilter } = body;

        // Fetch patients from Elation
        const patientsResponse = await fetchFromElation<{ results: ElationPatient[]; count: number }>(
          accessToken,
          "/patients/",
          { limit: limit.toString(), offset: offset.toString() }
        );

        if (!patientsResponse) {
          return cors.response(500, { ok: false, error: "Failed to fetch patients from Elation" });
        }

        const patients = patientsResponse.results;
        let syncedCount = 0;

        // For each patient, fetch their clinical data and store
        for (const patient of patients) {
          try {
            // Fetch problems, allergies, medications in parallel
            const [problems, allergies, medications] = await Promise.all([
              fetchFromElation<{ results: ElationProblem[] }>(accessToken, "/problems/", {
                patient: patient.id.toString(),
              }),
              fetchFromElation<{ results: ElationAllergy[] }>(accessToken, "/allergies/", {
                patient: patient.id.toString(),
              }),
              fetchFromElation<{ results: ElationMedication[] }>(accessToken, "/medications/", {
                patient: patient.id.toString(),
              }),
            ]);

            // Filter by condition if specified
            if (problemFilter) {
              const hasCondition = problems?.results?.some(
                (p) =>
                  p.description?.toLowerCase().includes(problemFilter.toLowerCase()) ||
                  p.icd10_code?.toLowerCase().includes(problemFilter.toLowerCase())
              );
              if (!hasCondition) continue;
            }

            // Upsert patient
            await query(
              `INSERT INTO elation_patients (
                provider_id, elation_patient_id, first_name, last_name, dob, sex, email, phone,
                city, state, zip, problems, allergies, medications, last_synced_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
              ON CONFLICT (provider_id, elation_patient_id) DO UPDATE SET
                first_name = $3, last_name = $4, dob = $5, sex = $6, email = $7, phone = $8,
                city = $9, state = $10, zip = $11, problems = $12, allergies = $13, medications = $14,
                last_synced_at = NOW(), updated_at = NOW()`,
              [
                providerId,
                patient.id,
                patient.first_name,
                patient.last_name,
                patient.dob,
                patient.sex,
                patient.email,
                patient.primary_phone,
                patient.address?.city,
                patient.address?.state,
                patient.address?.zip,
                JSON.stringify(problems?.results || []),
                JSON.stringify(allergies?.results || []),
                JSON.stringify(medications?.results || []),
              ]
            );

            syncedCount++;
          } catch (err) {
            console.error(`Failed to sync patient ${patient.id}:`, err);
          }
        }

        // Update last sync time
        await query(
          `UPDATE elation_connections SET last_sync_at = NOW() WHERE provider_id = $1`,
          [providerId]
        );

        await logAuditEvent(
          userId,
          "ELATION_SYNC",
          "elation_patients",
          providerId,
          undefined,
          { syncedCount, totalAvailable: patientsResponse.count },
          event.headers?.["x-forwarded-for"],
          event.headers?.["user-agent"]
        );

        return cors.response(200, {
          ok: true,
          syncedCount,
          totalCount: patientsResponse.count,
          syncedAt: new Date().toISOString(),
        });
      }

      // Run matching for a trial against Elation patients
      if (action === "match_trial") {
        const { nctId, trialConditions, minAge, maxAge, gender } = body;

        if (!nctId) {
          return cors.response(400, { ok: false, error: "nctId required" });
        }

        // Get all synced patients
        const patientsResult = await query(
          `SELECT * FROM elation_patients WHERE provider_id = $1`,
          [providerId]
        );

        let matchCount = 0;

        for (const patient of patientsResult.rows) {
          const reasons: string[] = [];
          let score = 0;

          // Age matching
          if (patient.dob) {
            const age = Math.floor(
              (Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
            );
            const minAgeNum = minAge ? parseInt(minAge, 10) : 0;
            const maxAgeNum = maxAge ? parseInt(maxAge, 10) : 120;

            if (age >= minAgeNum && age <= maxAgeNum) {
              score += 20;
              reasons.push(`Age ${age} within range ${minAgeNum}-${maxAgeNum}`);
            } else {
              continue; // Skip if age doesn't match
            }
          }

          // Gender matching
          if (gender && gender !== "All") {
            const patientGender = patient.sex?.toLowerCase();
            const requiredGender = gender.toLowerCase();
            if (patientGender === requiredGender) {
              score += 10;
              reasons.push(`Gender matches (${gender})`);
            } else {
              continue; // Skip if gender doesn't match
            }
          } else {
            score += 10;
          }

          // Condition matching
          const problems = patient.problems || [];
          if (trialConditions && trialConditions.length > 0) {
            const conditionTerms = trialConditions.map((c: string) => c.toLowerCase());
            const matchedConditions = problems.filter((p: any) =>
              conditionTerms.some(
                (term: string) =>
                  p.description?.toLowerCase().includes(term) ||
                  p.icd10_code?.toLowerCase().includes(term)
              )
            );

            if (matchedConditions.length > 0) {
              score += 40 * Math.min(matchedConditions.length / conditionTerms.length, 1);
              reasons.push(`Condition match: ${matchedConditions.map((m: any) => m.description).join(", ")}`);
            }
          }

          // Only store if there's some match
          if (score > 20) {
            await query(
              `INSERT INTO elation_trial_matches (
                provider_id, elation_patient_id, nct_id, match_score, match_reasons, eligibility_status
              ) VALUES ($1, $2, $3, $4, $5, 'potential')
              ON CONFLICT (provider_id, elation_patient_id, nct_id) DO UPDATE SET
                match_score = $4, match_reasons = $5, updated_at = NOW()`,
              [providerId, patient.elation_patient_id, nctId.toUpperCase(), Math.round(score), JSON.stringify(reasons)]
            );
            matchCount++;
          }
        }

        return cors.response(200, {
          ok: true,
          matchCount,
          nctId,
        });
      }

      // Update match status
      if (action === "update_match") {
        const { elationPatientId, nctId, status } = body;

        if (!elationPatientId || !nctId) {
          return cors.response(400, { ok: false, error: "elationPatientId and nctId required" });
        }

        await query(
          `UPDATE elation_trial_matches
           SET eligibility_status = $1, contacted_at = CASE WHEN $1 = 'contacted' THEN NOW() ELSE contacted_at END, updated_at = NOW()
           WHERE provider_id = $2 AND elation_patient_id = $3 AND nct_id = $4`,
          [status, providerId, elationPatientId, nctId.toUpperCase()]
        );

        return cors.response(200, { ok: true });
      }

      // Disconnect Elation
      if (action === "disconnect") {
        await query(`DELETE FROM elation_trial_matches WHERE provider_id = $1`, [providerId]);
        await query(`DELETE FROM elation_patients WHERE provider_id = $1`, [providerId]);
        await query(`DELETE FROM elation_connections WHERE provider_id = $1`, [providerId]);

        await logAuditEvent(
          userId,
          "ELATION_DISCONNECTED",
          "elation_connection",
          providerId,
          undefined,
          {},
          event.headers?.["x-forwarded-for"],
          event.headers?.["user-agent"]
        );

        return cors.response(200, { ok: true, message: "Elation disconnected" });
      }

      return cors.response(400, { ok: false, error: "Invalid action" });
    }

    return cors.response(405, { error: "Method not allowed" });
  } catch (error: any) {
    console.error("Elation API error:", error);
    return cors.response(500, {
      ok: false,
      error: error.message || "Internal server error",
    });
  }
};
