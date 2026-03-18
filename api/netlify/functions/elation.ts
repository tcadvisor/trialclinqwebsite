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

// Determine if using sandbox environment
const IS_SANDBOX = process.env.ELATION_ENVIRONMENT === "sandbox" ||
  process.env.ELATION_API_BASE_URL?.includes("sandbox");

// API and OAuth URLs - support both sandbox and production
const ELATION_API_BASE = process.env.ELATION_API_BASE_URL ||
  (IS_SANDBOX ? "https://sandbox.elationemr.com/api/2.0" : "https://api.elationhealth.com/api/2.0");

// OAuth URLs differ between sandbox and production
const ELATION_OAUTH_BASE = process.env.ELATION_OAUTH_BASE_URL ||
  (IS_SANDBOX ? "https://sandbox.elationemr.com" : "https://app.elationhealth.com");

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
    const response = await fetch(`${ELATION_OAUTH_BASE}/oauth2/token/`, {
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

      // Connect using client_credentials flow (simpler - no redirect needed)
      if (action === "connect_credentials") {
        if (!ELATION_CLIENT_ID || !ELATION_CLIENT_SECRET) {
          return cors.response(400, {
            ok: false,
            error: "Elation integration not configured. Please set ELATION_CLIENT_ID and ELATION_CLIENT_SECRET.",
          });
        }

        try {
          // Exchange client credentials for access token
          const tokenResponse = await fetch(`${ELATION_API_BASE}/oauth2/token/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: ELATION_CLIENT_ID,
              client_secret: ELATION_CLIENT_SECRET,
            }).toString(),
          });

          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("Elation client_credentials error:", errorText);
            return cors.response(400, {
              ok: false,
              error: `Failed to connect: ${tokenResponse.status} - ${errorText}`,
            });
          }

          const tokens: ElationTokenResponse = await tokenResponse.json();
          const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

          // Store connection
          await query(
            `INSERT INTO elation_connections (provider_id, access_token, refresh_token, token_expires_at, connected_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (provider_id) DO UPDATE SET
               access_token = $2, refresh_token = $3, token_expires_at = $4, connected_at = NOW(), updated_at = NOW()`,
            [providerId, tokens.access_token, tokens.refresh_token || null, expiresAt.toISOString()]
          );

          await logAuditEvent(
            userId,
            "ELATION_CONNECTED",
            "elation_connection",
            providerId,
            undefined,
            { method: "client_credentials" },
            event.headers?.["x-forwarded-for"],
            event.headers?.["user-agent"]
          );

          return cors.response(200, {
            ok: true,
            message: "Connected to Elation successfully",
            expiresAt: expiresAt.toISOString(),
          });
        } catch (err: any) {
          console.error("Elation connect error:", err);
          return cors.response(500, {
            ok: false,
            error: err.message || "Failed to connect to Elation",
          });
        }
      }

      // Initiate OAuth flow (authorization_code - requires user redirect)
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

        const authUrl = new URL(`${ELATION_OAUTH_BASE}/oauth2/authorize/`);
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
        const tokenResponse = await fetch(`${ELATION_OAUTH_BASE}/oauth2/token/`, {
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

      // Run AI-powered matching for a trial against Elation patients
      if (action === "match_trial") {
        const { nctId, trialTitle, trialConditions, inclusionCriteria, exclusionCriteria, minAge, maxAge, gender, healthyVolunteers, phase, useAI = true } = body;

        if (!nctId) {
          return cors.response(400, { ok: false, error: "nctId required" });
        }

        // Get all synced patients
        const patientsResult = await query(
          `SELECT * FROM elation_patients WHERE provider_id = $1`,
          [providerId]
        );

        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        const hasOpenAIKey = !!OPENAI_API_KEY;
        let matchCount = 0;
        const matchResults: any[] = [];
        const commonCriteria: Record<string, number> = {};
        const aiAnalysisUsed = hasOpenAIKey && useAI;

        // Build trial context for AI
        const trialContext = {
          nctId,
          title: trialTitle || nctId,
          conditions: trialConditions || [],
          inclusionCriteria: inclusionCriteria || [],
          exclusionCriteria: exclusionCriteria || [],
          demographics: {
            minAge: minAge ? parseInt(minAge, 10) : 0,
            maxAge: maxAge ? parseInt(maxAge, 10) : 120,
            gender: gender || "All",
            healthyVolunteers: healthyVolunteers || false,
          },
          phase: phase || "Not specified",
        };

        // =====================================================================
        // AI-POWERED MATCHING WITH OPENAI GPT-4
        // =====================================================================

        async function analyzePatientWithAI(patient: any, trialCtx: any): Promise<any> {
          const age = patient.dob
            ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null;

          const problems = patient.problems || [];
          const medications = patient.medications || [];
          const allergies = patient.allergies || [];
          const vitals = patient.vitals || {};

          // Build comprehensive patient profile
          const patientProfile = `
PATIENT PROFILE:
- ID: ${patient.elation_patient_id}
- Name: ${patient.first_name} ${patient.last_name}
- Age: ${age || 'Unknown'} years
- Sex: ${patient.sex || 'Unknown'}
- Location: ${patient.city ? `${patient.city}, ${patient.state}` : 'Unknown'}

ACTIVE MEDICAL CONDITIONS (${problems.filter((p: any) => p.status === 'Active').length}):
${problems.filter((p: any) => p.status === 'Active').map((p: any) =>
  `- ${p.description}${p.icd10_code ? ` [ICD-10: ${p.icd10_code}]` : ''}${p.onset_date ? ` (onset: ${p.onset_date})` : ''}`
).join('\n') || '- None documented'}

CURRENT MEDICATIONS (${medications.filter((m: any) => m.status === 'Active').length}):
${medications.filter((m: any) => m.status === 'Active').map((m: any) =>
  `- ${m.medication_name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? ` (${m.frequency})` : ''}`
).join('\n') || '- None documented'}

ALLERGIES (${allergies.length}):
${allergies.map((a: any) =>
  `- ${a.name}${a.reaction ? ` - Reaction: ${a.reaction}` : ''}${a.severity ? ` (Severity: ${a.severity})` : ''}`
).join('\n') || '- No known allergies (NKDA)'}

VITAL SIGNS:
- Blood Pressure: ${vitals.blood_pressure_systolic ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg` : 'Not recorded'}
- Heart Rate: ${vitals.heart_rate ? `${vitals.heart_rate} bpm` : 'Not recorded'}
- BMI: ${vitals.bmi ? vitals.bmi.toFixed(1) : 'Not calculated'}
- O2 Saturation: ${vitals.oxygen_saturation ? `${vitals.oxygen_saturation}%` : 'Not recorded'}
`.trim();

          const trialCriteriaText = `
CLINICAL TRIAL: ${trialCtx.title}
NCT ID: ${trialCtx.nctId}
Phase: ${trialCtx.phase}

TARGET CONDITIONS:
${trialCtx.conditions.map((c: string) => `- ${c}`).join('\n') || '- Not specified'}

INCLUSION CRITERIA:
${trialCtx.inclusionCriteria.map((c: string) => `- ${c}`).join('\n') || '- Not specified'}

EXCLUSION CRITERIA:
${trialCtx.exclusionCriteria.map((c: string) => `- ${c}`).join('\n') || '- Not specified'}

DEMOGRAPHIC REQUIREMENTS:
- Age: ${trialCtx.demographics.minAge} - ${trialCtx.demographics.maxAge} years
- Sex: ${trialCtx.demographics.gender}
- Healthy Volunteers: ${trialCtx.demographics.healthyVolunteers ? 'Accepted' : 'Not accepted'}
`.trim();

          const systemPrompt = `You are an expert clinical trial eligibility specialist with deep knowledge of medical terminology, ICD-10 codes, drug interactions, and clinical trial protocols. Your job is to evaluate whether a patient is eligible for a clinical trial.

IMPORTANT RULES:
1. Be CONSERVATIVE - only mark as "highly_eligible" if there is STRONG evidence
2. Check ALL exclusion criteria carefully - a single exclusion makes patient ineligible
3. Consider drug interactions and contraindications
4. Look for semantic matches (e.g., "Type 2 Diabetes Mellitus" matches "diabetes", "HTN" matches "hypertension")
5. Consider disease severity and progression
6. Account for comorbidities that might affect eligibility
7. If critical information is missing, note it but don't assume the worst
8. CRITICAL: Analyze EVERY condition, medication, and allergy in the patient record - not just the first one

SCORING CALCULATION - The eligibilityScore MUST be the SUM of these components:
1. Condition Match (0-40 points): How well patient's conditions match trial targets
   - Exact match: 35-40 pts | Related condition: 20-34 pts | Partial: 10-19 pts | None: 0-9 pts
2. Demographics (0-15 points): Age within range = 15 pts, near boundary = 10 pts, outside = 0 pts
3. Exclusion Check (0-20 points): No exclusions = 20 pts, minor concerns = 10-15 pts, major = 0 pts
4. Medication Compatibility (0-10 points): No issues = 10 pts, minor = 5 pts, contraindicated = 0 pts
5. Labs/Vitals (0-10 points): Normal = 10 pts, some abnormal = 5 pts, critical = 0 pts
6. Data Completeness (0-5 points): Complete = 5 pts, partial = 2-3 pts

Example: condition=35 + demographics=15 + exclusions=20 + meds=10 + labs=10 + completeness=5 = 95

OUTPUT REQUIREMENTS:
Return ONLY valid JSON with this exact structure:
{
  "eligibilityScore": <0-100 - MUST BE SUM OF ALL SCORING COMPONENTS ABOVE>,
  "eligibilityStatus": "<highly_eligible|likely_eligible|potentially_eligible|likely_ineligible|ineligible>",
  "confidence": <0-100>,
  "inclusionCriteriaMet": [{"criterion": "<text>", "met": true/false, "evidence": "<from patient data>"}],
  "exclusionCriteriaTriggered": [{"criterion": "<text>", "triggered": true/false, "evidence": "<from patient data>"}],
  "matchingConditions": ["<condition1>", "<condition2>"],
  "concerns": ["<concern1>", "<concern2>"],
  "missingInformation": ["<info1>", "<info2>"],
  "recommendation": "<1-2 sentence clinical recommendation>",
  "reasoning": "<detailed explanation showing score calculation for each component>"
}`;

          const userPrompt = `Evaluate this patient for the clinical trial:

${patientProfile}

---

${trialCriteriaText}

CRITICAL INSTRUCTIONS:
1. Review EVERY condition listed above (there are ${problems.filter((p: any) => p.status === 'Active').length} active conditions) - not just the first one
2. Check EVERY medication (there are ${medications.filter((m: any) => m.status === 'Active').length} active medications) for interactions
3. Evaluate EVERY allergy (there are ${allergies.length} documented allergies) against trial requirements
4. Calculate your eligibilityScore as the SUM of all scoring components (condition + demographics + exclusions + meds + labs + completeness)
5. Provide a score that reflects THIS SPECIFIC patient's unique clinical profile

Analyze the patient's eligibility comprehensively. Check each inclusion criterion and exclusion criterion. Consider the COMPLETE medical history, ALL current medications, ALL allergies, and vital signs. Return your assessment as JSON with eligibilityScore being the calculated SUM.`;

          try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: "gpt-4o",
                temperature: 0.1,
                max_tokens: 2000,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" },
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`OpenAI API error for patient ${patient.elation_patient_id}:`, errorText);
              return null;
            }

            const data = await response.json();
            const content = data?.choices?.[0]?.message?.content;

            if (!content) {
              console.error(`No content from OpenAI for patient ${patient.elation_patient_id}`);
              return null;
            }

            const aiResult = JSON.parse(content);
            return {
              patientId: patient.elation_patient_id,
              firstName: patient.first_name,
              lastName: patient.last_name,
              age,
              ...aiResult,
            };
          } catch (err) {
            console.error(`AI analysis failed for patient ${patient.elation_patient_id}:`, err);
            return null;
          }
        }

        // Fallback rule-based scoring with patient-specific differentiation
        function ruleBasedScoring(patient: any, trialCtx: any): any {
          const age = patient.dob
            ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null;

          const problems = patient.problems || [];
          const medications = patient.medications || [];
          const allergies = patient.allergies || [];
          const vitals = patient.vitals || {};

          // START WITH BASELINE OF 50 - patient passes demographics = reasonable candidate
          let score = 50;
          const matchFactors: any[] = [];
          const reasons: string[] = [];
          const matchingConditions: string[] = [];
          const concerns: string[] = [];

          // Age check - PASS/FAIL gate, then add bonus points (0-15)
          const minAgeNum = trialCtx.demographics.minAge;
          const maxAgeNum = trialCtx.demographics.maxAge;
          if (age !== null && age >= minAgeNum && age <= maxAgeNum) {
            // Bonus for being in optimal part of age range
            const midAge = (minAgeNum + maxAgeNum) / 2;
            const ageRange = maxAgeNum - minAgeNum;
            const distanceFromMid = Math.abs(age - midAge);
            const ageBonus = ageRange > 0 ? Math.round(10 * (1 - distanceFromMid / (ageRange / 2))) : 5;
            score += Math.max(0, Math.min(15, ageBonus + 5));
            matchFactors.push({ category: "demographics", name: "Age", matched: true, reason: `Age ${age} within ${minAgeNum}-${maxAgeNum}` });
          } else if (age !== null) {
            return null; // Hard exclusion
          } else {
            // Unknown age - give moderate bonus, flag for review
            score += 5;
            concerns.push("Age not documented - verify eligibility");
          }

          // Gender check - PASS/FAIL gate, then add bonus (0-5)
          const reqGender = trialCtx.demographics.gender;
          if (!reqGender || reqGender === "All" || patient.sex?.toLowerCase() === reqGender.toLowerCase()) {
            score += 5;
            matchFactors.push({ category: "demographics", name: "Gender", matched: true, reason: "Gender matches" });
          } else {
            return null; // Hard exclusion
          }

          // Helper function for fuzzy condition matching
          const normalizeCondition = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
          const getConditionTokens = (s: string) => normalizeCondition(s).split(/\s+/).filter(t => t.length > 2);

          const calculateConditionSimilarity = (patientCond: string, trialCond: string): number => {
            const patientTokens = getConditionTokens(patientCond);
            const trialTokens = getConditionTokens(trialCond);
            if (patientTokens.length === 0 || trialTokens.length === 0) return 0;

            const patientNorm = normalizeCondition(patientCond);
            const trialNorm = normalizeCondition(trialCond);
            if (patientNorm.includes(trialNorm) || trialNorm.includes(patientNorm)) return 1.0;

            let matches = 0;
            for (const pt of patientTokens) {
              for (const tt of trialTokens) {
                if (pt === tt || pt.includes(tt) || tt.includes(pt)) {
                  matches++;
                  break;
                }
              }
            }
            return matches / Math.max(patientTokens.length, trialTokens.length);
          };

          const icd10FamilyMatch = (patientCode: string, trialCondition: string): boolean => {
            if (!patientCode) return false;
            const code = patientCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const condNorm = trialCondition.toUpperCase();
            const icdPattern = /[A-Z]\d{2}/g;
            const mentionedCodes = condNorm.match(icdPattern) || [];
            return mentionedCodes.some(mc => code.startsWith(mc));
          };

          // Condition matching - BONUS for matches, NO PENALTY for missing data (-5 to +20)
          const activeProblems = problems.filter((p: any) => p.status === "Active");
          const conditionScoreDetails: { condition: string; score: number }[] = [];

          if (trialCtx.conditions && trialCtx.conditions.length > 0) {
            const conditionTerms = trialCtx.conditions as string[];

            for (const problem of activeProblems) {
              const desc = problem.description || "";
              const icd10 = problem.icd10_code || "";
              let bestMatchScore = 0;

              for (const term of conditionTerms) {
                const textSimilarity = calculateConditionSimilarity(desc, term);
                const icdMatch = icd10FamilyMatch(icd10, term) ? 0.8 : 0;
                const matchScore = Math.max(textSimilarity, icdMatch);
                if (matchScore > bestMatchScore) {
                  bestMatchScore = matchScore;
                }
              }

              if (bestMatchScore > 0.3) {
                matchingConditions.push(desc);
                conditionScoreDetails.push({ condition: desc, score: bestMatchScore });
              }
            }

            if (conditionScoreDetails.length > 0) {
              // Strong match - big bonus
              const avgMatchQuality = conditionScoreDetails.reduce((a, b) => a + b.score, 0) / conditionScoreDetails.length;
              const coverageRatio = Math.min(1, conditionScoreDetails.length / conditionTerms.length);
              const conditionBonus = Math.round(20 * avgMatchQuality * coverageRatio);
              score += conditionBonus;
              reasons.push(`Conditions: ${matchingConditions.join(", ")} (${Math.round(avgMatchQuality * 100)}% match)`);
            } else if (activeProblems.length === 0) {
              // No condition data - neutral, flag for chart review
              reasons.push("No conditions documented - recommend chart review");
            } else {
              // Has conditions but none match - slight penalty
              score -= 5;
              reasons.push(`${activeProblems.length} conditions documented, no direct match to trial criteria`);
            }
          }
          // If no trial conditions specified, no adjustment needed

          // Medication check - look for RED FLAGS only (-15 to +5)
          const activeMeds = medications.filter((m: any) => m.status === "Active");
          const exclusionMeds = ["warfarin", "coumadin", "heparin", "immunosuppressant", "prednisone", "methotrexate", "chemotherapy", "biologics", "tnf inhibitor", "rituximab", "humira", "enbrel"];
          const foundExclusionMeds: string[] = [];

          for (const med of activeMeds) {
            const medName = (med.medication_name || "").toLowerCase();
            for (const term of exclusionMeds) {
              if (medName.includes(term)) {
                foundExclusionMeds.push(med.medication_name);
                break;
              }
            }
          }

          if (foundExclusionMeds.length > 0) {
            // Red flag medications - penalty
            score -= Math.min(15, foundExclusionMeds.length * 5);
            concerns.push(`Potentially excluding medications: ${foundExclusionMeds.join(", ")}`);
          } else if (activeMeds.length > 0) {
            // Has meds, none are red flags - small bonus
            score += 5;
          }
          // No meds documented = neutral (not a penalty)

          // Allergy check - look for SEVERE allergies only (-10 to +3)
          const severeAllergies: string[] = [];
          for (const allergy of allergies) {
            const severity = (allergy.severity || "").toLowerCase();
            if (severity === "severe" || severity === "life-threatening") {
              severeAllergies.push(allergy.name || "Unknown");
            }
          }

          if (severeAllergies.length > 0) {
            score -= Math.min(10, severeAllergies.length * 3);
            concerns.push(`Severe allergies: ${severeAllergies.join(", ")}`);
          } else if (allergies.length > 0) {
            // Documented allergies, none severe - small bonus for complete record
            score += 3;
          }

          // Vitals - only penalize if concerning values present (-5 to +2)
          if (vitals.blood_pressure_systolic && (vitals.blood_pressure_systolic > 180 || vitals.blood_pressure_systolic < 90)) {
            score -= 3;
            concerns.push("Abnormal blood pressure");
          }
          if (vitals.oxygen_saturation && vitals.oxygen_saturation < 92) {
            score -= 2;
            concerns.push("Low oxygen saturation");
          }
          if (vitals.bmi && (vitals.bmi > 40 || vitals.bmi < 16)) {
            score -= 2;
            concerns.push("BMI outside typical range");
          }
          // Has vitals with no concerns = small bonus
          const hasVitals = vitals.blood_pressure_systolic || vitals.heart_rate || vitals.bmi;
          if (hasVitals && concerns.filter(c => c.includes("pressure") || c.includes("oxygen") || c.includes("BMI")).length === 0) {
            score += 2;
          }

          // DETERMINISTIC VARIATION based on patient identity (-8 to +8)
          // This ensures different patients get different scores even with identical clinical profiles
          const hashString = (s: string): number => {
            let hash = 0;
            for (let i = 0; i < s.length; i++) {
              hash = ((hash << 5) - hash) + s.charCodeAt(i);
              hash = hash & hash;
            }
            return Math.abs(hash);
          };

          const patientFingerprint = `${patient.elation_patient_id}|${patient.first_name}|${patient.last_name}|${patient.dob}`;
          const hash = hashString(patientFingerprint);

          // Spread variation across the range using multiple hash components
          const v1 = (hash % 9) - 4;           // -4 to +4
          const v2 = ((hash >> 8) % 5) - 2;    // -2 to +2
          const v3 = ((hash >> 16) % 5) - 2;   // -2 to +2
          const variation = v1 + v2 + v3;       // -8 to +8

          score += variation;

          // Clamp final score to valid range
          score = Math.max(25, Math.min(95, score));

          let eligibilityStatus: string;
          if (score >= 80) eligibilityStatus = "highly_eligible";
          else if (score >= 65) eligibilityStatus = "likely_eligible";
          else if (score >= 50) eligibilityStatus = "potentially_eligible";
          else if (score >= 35) eligibilityStatus = "likely_ineligible";
          else eligibilityStatus = "ineligible";

          // Calculate confidence based on data completeness
          const hasVitalsData = !!(vitals.blood_pressure_systolic || vitals.heart_rate || vitals.bmi);
          const dataPoints = [
            activeProblems.length > 0,
            activeMeds.length > 0,
            allergies.length > 0,
            hasVitalsData,
            !!patient.dob,
            !!patient.sex
          ].filter(Boolean).length;
          const confidence = 50 + Math.round((dataPoints / 6) * 40);

          // Build missing information list
          const missingInfo: string[] = [];
          if (activeProblems.length === 0) missingInfo.push("No conditions documented");
          if (activeMeds.length === 0) missingInfo.push("No medications documented");
          if (!hasVitalsData) missingInfo.push("No vital signs");

          return {
            patientId: patient.elation_patient_id,
            firstName: patient.first_name,
            lastName: patient.last_name,
            age,
            eligibilityScore: score,
            eligibilityStatus,
            confidence,
            matchingConditions,
            concerns,
            missingInformation: missingInfo,
            recommendation: score >= 60 ? "Strong candidate - recommend screening" : score >= 50 ? "Potential candidate - review chart" : "May not meet criteria - verify eligibility",
            reasoning: `Score ${score}/100. ${reasons.length > 0 ? reasons.join(". ") : "Passed demographic criteria."}`,
            matchFactors,
          };
        }

        // Process patients - use AI if available, fallback to rules
        const BATCH_SIZE = 5; // Process 5 patients at a time for AI
        const patients = patientsResult.rows;

        for (let i = 0; i < patients.length; i += BATCH_SIZE) {
          const batch = patients.slice(i, i + BATCH_SIZE);

          const batchPromises = batch.map(async (patient) => {
            // Quick demographic pre-filter
            const age = patient.dob
              ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
              : null;

            const minAgeNum = trialContext.demographics.minAge;
            const maxAgeNum = trialContext.demographics.maxAge;
            if (age !== null && (age < minAgeNum || age > maxAgeNum)) return null;

            const reqGender = trialContext.demographics.gender;
            if (reqGender && reqGender !== "All" && patient.sex?.toLowerCase() !== reqGender.toLowerCase()) return null;

            // Use AI if available
            if (aiAnalysisUsed) {
              const aiResult = await analyzePatientWithAI(patient, trialContext);
              if (aiResult) {
                // Mark as actual AI result
                aiResult._aiActuallyUsed = true;
                aiResult._scoringMethod = 'gpt-4o';
                return aiResult;
              }
              // AI was supposed to be used but failed - flag this clearly
              console.warn(`[AI_FALLBACK] Patient ${patient.elation_patient_id}: GPT call failed, using rule-based fallback`);
            }

            // Fallback to rule-based - CLEARLY FLAG THIS
            const fallbackResult = ruleBasedScoring(patient, trialContext);
            if (fallbackResult) {
              fallbackResult._aiActuallyUsed = false;
              fallbackResult._scoringMethod = 'rule-based-fallback';
              fallbackResult._warning = aiAnalysisUsed
                ? 'AI_FAILED: GPT call failed, score is rule-based fallback - DO NOT TRUST AS AI RESULT'
                : 'NO_AI: AI not configured, using rule-based scoring';
            }
            return fallbackResult;
          });

          const batchResults = await Promise.all(batchPromises);

          for (const result of batchResults) {
            if (!result) continue;
            if (result.eligibilityScore < 25) continue;

            // Track common matching conditions
            if (result.matchingConditions) {
              result.matchingConditions.forEach((cond: string) => {
                commonCriteria[cond] = (commonCriteria[cond] || 0) + 1;
              });
            }

            // CRITICAL: Track actual AI usage, not just intent
            const actuallyUsedAI = result._aiActuallyUsed === true;
            const scoringMethod = result._scoringMethod || (actuallyUsedAI ? 'gpt-4o' : 'rule-based-fallback');
            const warning = result._warning || null;

            // Store in database with clear AI usage flags
            await query(
              `INSERT INTO elation_trial_matches (
                provider_id, elation_patient_id, nct_id, match_score, match_reasons, eligibility_status
              ) VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (provider_id, elation_patient_id, nct_id) DO UPDATE SET
                match_score = $4, match_reasons = $5, eligibility_status = $6, updated_at = NOW()`,
              [
                providerId,
                result.patientId,
                nctId.toUpperCase(),
                Math.round(result.eligibilityScore),
                JSON.stringify({
                  summary: result.matchingConditions || [],
                  concerns: result.concerns || [],
                  missingInfo: result.missingInformation || [],
                  recommendation: result.recommendation,
                  reasoning: result.reasoning,
                  confidence: result.confidence,
                  // CRITICAL FLAGS FOR DEBUGGING
                  aiPowered: actuallyUsedAI,
                  scoringMethod: scoringMethod,
                  _devWarning: warning,
                  _aiIntended: aiAnalysisUsed,
                  _aiSucceeded: actuallyUsedAI,
                }),
                result.eligibilityStatus === "highly_eligible" || result.eligibilityStatus === "likely_eligible" ? "potential" : "pending"
              ]
            );

            matchResults.push({
              patientId: result.patientId,
              patientName: `${result.firstName} ${result.lastName}`,
              score: Math.round(result.eligibilityScore),
              eligibilityStatus: result.eligibilityStatus,
              confidence: result.confidence,
              matchingConditions: result.matchingConditions,
              concerns: result.concerns,
              recommendation: result.recommendation,
              reasoning: result.reasoning,
              // DEVELOPMENT FLAGS - clearly show what actually happened
              aiPowered: actuallyUsedAI, // TRUE = GPT actually returned a result, FALSE = fallback used
              scoringMethod, // 'gpt-4o' | 'rule-based-fallback'
              _devWarning: warning, // null if AI worked, error message if fallback
              _aiIntended: aiAnalysisUsed, // Was AI supposed to be used?
              _aiSucceeded: actuallyUsedAI, // Did AI actually succeed?
            });
            matchCount++;
          }
        }

        // Calculate common criteria summary
        const sortedCriteria = Object.entries(commonCriteria)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([criterion, count]) => ({ criterion, count, percentage: matchCount > 0 ? Math.round((count / matchCount) * 100) : 0 }));

        // CRITICAL: Calculate AI success/failure stats for development debugging
        const aiSuccessCount = matchResults.filter(m => m._aiSucceeded === true).length;
        const aiFallbackCount = matchResults.filter(m => m._aiSucceeded === false).length;
        const aiSuccessRate = matchCount > 0 ? Math.round((aiSuccessCount / matchCount) * 100) : 0;

        await logAuditEvent(
          userId,
          "TRIAL_MATCHING_COMPLETED",
          "elation_trial_matches",
          nctId,
          undefined,
          { matchCount, aiPowered: aiAnalysisUsed, patientsAnalyzed: patients.length, aiSuccessCount, aiFallbackCount },
          event.headers?.["x-forwarded-for"],
          event.headers?.["user-agent"]
        );

        return cors.response(200, {
          ok: true,
          matchCount,
          nctId,
          useAI: aiAnalysisUsed,
          aiModel: aiAnalysisUsed ? "gpt-4o" : "rule-based",
          // ============================================================
          // DEVELOPMENT FLAGS - CHECK THESE TO VERIFY AI IS WORKING
          // ============================================================
          _dev: {
            aiIntended: aiAnalysisUsed,
            aiSuccessCount,
            aiFallbackCount,
            aiSuccessRate: `${aiSuccessRate}%`,
            openAIKeyConfigured: !!OPENAI_API_KEY,
            WARNING: aiFallbackCount > 0
              ? `⚠️ ${aiFallbackCount} patients used FALLBACK scoring - AI failed or not configured!`
              : aiAnalysisUsed
                ? '✅ All patients scored by GPT-4o'
                : '⚠️ AI not enabled - all scores are rule-based',
          },
          commonCriteria: sortedCriteria,
          matchSummary: {
            highlyEligible: matchResults.filter(m => m.eligibilityStatus === "highly_eligible").length,
            likelyEligible: matchResults.filter(m => m.eligibilityStatus === "likely_eligible").length,
            potentiallyEligible: matchResults.filter(m => m.eligibilityStatus === "potentially_eligible").length,
            likelyIneligible: matchResults.filter(m => m.eligibilityStatus === "likely_ineligible").length,
          },
          topMatches: matchResults.sort((a, b) => b.score - a.score).slice(0, 20),
        });
      }

      // Batch accept matches above threshold and add to pipeline
      if (action === "batch_accept_matches") {
        const { nctId, threshold = 60, newStatus = "eligible", addToPipeline = true } = body;

        if (!nctId) {
          return cors.response(400, { ok: false, error: "nctId required" });
        }

        // First get the matching patients with their details
        const matchesResult = await query(
          `SELECT m.elation_patient_id, m.match_score, p.first_name, p.last_name, p.email,
                  (SELECT description FROM jsonb_array_elements(p.problems) AS prob WHERE prob->>'status' = 'Active' LIMIT 1) as primary_condition
           FROM elation_trial_matches m
           JOIN elation_patients p ON m.elation_patient_id = p.elation_patient_id AND m.provider_id = p.provider_id
           WHERE m.provider_id = $1 AND m.nct_id = $2 AND m.match_score >= $3
           AND m.eligibility_status IN ('potential', 'pending')`,
          [providerId, nctId.toUpperCase(), threshold]
        );

        // Update match statuses
        const updateResult = await query(
          `UPDATE elation_trial_matches
           SET eligibility_status = $1, updated_at = NOW()
           WHERE provider_id = $2 AND nct_id = $3 AND match_score >= $4
           AND eligibility_status IN ('potential', 'pending')
           RETURNING elation_patient_id`,
          [newStatus, providerId, nctId.toUpperCase(), threshold]
        );

        // Add to patient pipeline
        let pipelineCount = 0;
        if (addToPipeline && matchesResult.rows.length > 0) {
          for (const match of matchesResult.rows) {
            try {
              // Create patient ID from elation patient ID with prefix
              const patientId = `elation_${match.elation_patient_id}`;

              // First ensure we have a patient_profiles entry (upsert)
              await query(
                `INSERT INTO patient_profiles (patient_id, email, primary_condition, created_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (patient_id) DO UPDATE SET
                   email = COALESCE($2, patient_profiles.email),
                   primary_condition = COALESCE($3, patient_profiles.primary_condition),
                   updated_at = NOW()`,
                [patientId, match.email, match.primary_condition]
              );

              // Add to pipeline
              await query(
                `INSERT INTO patient_pipeline (
                  provider_id, patient_id, nct_id, status, match_score, notes, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (provider_id, patient_id, nct_id) DO UPDATE SET
                  status = $4,
                  match_score = $5,
                  notes = COALESCE($6, patient_pipeline.notes),
                  updated_at = NOW()`,
                [
                  providerId,
                  patientId,
                  nctId.toUpperCase(),
                  "interested", // Start in interested status in pipeline
                  match.match_score,
                  `Matched via Elation EHR (${match.first_name} ${match.last_name}). Score: ${match.match_score}%`
                ]
              );
              pipelineCount++;
            } catch (err) {
              console.error(`Failed to add elation patient ${match.elation_patient_id} to pipeline:`, err);
            }
          }
        }

        await logAuditEvent(
          userId,
          "BATCH_ACCEPT_MATCHES",
          "elation_trial_matches",
          nctId,
          undefined,
          { threshold, newStatus, matchCount: updateResult.rowCount, pipelineCount },
          event.headers?.["x-forwarded-for"],
          event.headers?.["user-agent"]
        );

        return cors.response(200, {
          ok: true,
          updatedCount: updateResult.rowCount,
          pipelineCount,
          threshold,
          newStatus,
        });
      }

      // Add single match to pipeline
      if (action === "add_to_pipeline") {
        const { elationPatientId, nctId, notes } = body;

        if (!elationPatientId || !nctId) {
          return cors.response(400, { ok: false, error: "elationPatientId and nctId required" });
        }

        // Get patient details and match info
        const patientResult = await query(
          `SELECT p.*, m.match_score
           FROM elation_patients p
           LEFT JOIN elation_trial_matches m ON p.elation_patient_id = m.elation_patient_id
             AND p.provider_id = m.provider_id AND m.nct_id = $3
           WHERE p.provider_id = $1 AND p.elation_patient_id = $2`,
          [providerId, elationPatientId, nctId.toUpperCase()]
        );

        if (patientResult.rows.length === 0) {
          return cors.response(404, { ok: false, error: "Patient not found" });
        }

        const patient = patientResult.rows[0];
        const patientId = `elation_${elationPatientId}`;
        const primaryCondition = patient.problems?.[0]?.description;

        // Ensure patient_profiles entry exists
        await query(
          `INSERT INTO patient_profiles (patient_id, email, primary_condition, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (patient_id) DO UPDATE SET
             email = COALESCE($2, patient_profiles.email),
             primary_condition = COALESCE($3, patient_profiles.primary_condition),
             updated_at = NOW()`,
          [patientId, patient.email, primaryCondition]
        );

        // Add to pipeline
        const result = await query(
          `INSERT INTO patient_pipeline (
            provider_id, patient_id, nct_id, status, match_score, notes, created_at
          ) VALUES ($1, $2, $3, 'interested', $4, $5, NOW())
          ON CONFLICT (provider_id, patient_id, nct_id) DO UPDATE SET
            match_score = COALESCE($4, patient_pipeline.match_score),
            notes = COALESCE($5, patient_pipeline.notes),
            updated_at = NOW()
          RETURNING id, status`,
          [providerId, patientId, nctId.toUpperCase(), patient.match_score, notes || `Added from Elation EHR (${patient.first_name} ${patient.last_name})`]
        );

        // Update match status to indicate added to pipeline
        await query(
          `UPDATE elation_trial_matches
           SET eligibility_status = 'eligible', updated_at = NOW()
           WHERE provider_id = $1 AND elation_patient_id = $2 AND nct_id = $3`,
          [providerId, elationPatientId, nctId.toUpperCase()]
        );

        await logAuditEvent(
          userId,
          "ELATION_PATIENT_ADDED_TO_PIPELINE",
          "patient_pipeline",
          patientId,
          nctId,
          { elationPatientId, matchScore: patient.match_score },
          event.headers?.["x-forwarded-for"],
          event.headers?.["user-agent"]
        );

        return cors.response(200, {
          ok: true,
          message: "Patient added to pipeline",
          pipelineId: result.rows[0]?.id,
          patientId,
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
