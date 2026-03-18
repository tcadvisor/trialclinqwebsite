"use strict";
/**
 * User Data API - Health Profiles, Preferences, and Consent
 *
 * Stores user data in PostgreSQL instead of localStorage for:
 * - Health profiles (conditions, medications, allergies, etc.)
 * - Notification preferences
 * - Consent records
 * - Documents metadata
 *
 * This enables data to persist across browsers, devices, and incognito mode.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const cors = __importStar(require("./cors-utils"));
const db_1 = require("./db");
const csrf_utils_1 = require("./csrf-utils");
const crypto_1 = __importDefault(require("crypto"));
// ============================================================================
// Database Schema
// ============================================================================
async function ensureTablesExist() {
    await (0, db_1.initializeDatabase)();
    // Health profiles table
    await (0, db_1.query)(`
    CREATE TABLE IF NOT EXISTS health_profiles (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) UNIQUE NOT NULL,
      patient_id VARCHAR(255),
      age INTEGER,
      weight DECIMAL,
      gender VARCHAR(50),
      race VARCHAR(100),
      language VARCHAR(50),
      blood_group VARCHAR(20),
      genotype VARCHAR(50),
      primary_condition TEXT,
      additional_info TEXT,
      ecog VARCHAR(20),
      disease_stage VARCHAR(100),
      biomarkers TEXT,
      prior_therapies JSONB DEFAULT '[]',
      medications JSONB DEFAULT '[]',
      allergies JSONB DEFAULT '[]',
      comorbidity_cardiac BOOLEAN DEFAULT FALSE,
      comorbidity_renal BOOLEAN DEFAULT FALSE,
      comorbidity_hepatic BOOLEAN DEFAULT FALSE,
      comorbidity_autoimmune BOOLEAN DEFAULT FALSE,
      infection_hiv BOOLEAN DEFAULT FALSE,
      infection_hbv BOOLEAN DEFAULT FALSE,
      infection_hcv BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // User preferences table
    await (0, db_1.query)(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) UNIQUE NOT NULL,
      notify_email BOOLEAN DEFAULT TRUE,
      notify_trials BOOLEAN DEFAULT TRUE,
      notify_news BOOLEAN DEFAULT FALSE,
      consent_section1 BOOLEAN DEFAULT FALSE,
      consent_section2 BOOLEAN DEFAULT FALSE,
      consent_section3 BOOLEAN DEFAULT FALSE,
      consent_section4 BOOLEAN DEFAULT FALSE,
      consent_final BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Eligibility profiles table (signup flow data)
    await (0, db_1.query)(`
    CREATE TABLE IF NOT EXISTS eligibility_profiles (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) UNIQUE NOT NULL,
      dob DATE,
      age INTEGER,
      weight DECIMAL,
      gender VARCHAR(50),
      race VARCHAR(100),
      language VARCHAR(50),
      location TEXT,
      radius VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Create indexes
    await (0, db_1.query)(`CREATE INDEX IF NOT EXISTS idx_health_profiles_user_id ON health_profiles(user_id)`);
    await (0, db_1.query)(`CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)`);
    await (0, db_1.query)(`CREATE INDEX IF NOT EXISTS idx_eligibility_profiles_user_id ON eligibility_profiles(user_id)`);
}
// ============================================================================
// Auth Helper
// ============================================================================
function hashToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
async function getUserFromRequest(event) {
    // Check cookie first (httpOnly cookie), then header
    const cookieHeader = event.headers?.cookie || "";
    const cookieMatch = cookieHeader.match(/session_token=([^;]+)/);
    const token = cookieMatch?.[1] || event.headers?.["x-session-token"];
    if (!token) {
        return null;
    }
    const tokenHash = hashToken(token);
    const result = await (0, db_1.query)(`SELECT u.user_id, u.email
     FROM sessions s
     JOIN users u ON s.user_id = u.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`, [tokenHash]);
    if (result.rows.length === 0) {
        return null;
    }
    return {
        userId: result.rows[0].user_id,
        email: result.rows[0].email,
    };
}
// ============================================================================
// Handler
// ============================================================================
const handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return cors.response(204, "");
    }
    try {
        await ensureTablesExist();
        // Verify authentication
        const user = await getUserFromRequest(event);
        if (!user) {
            return cors.response(401, { error: "Unauthorized" });
        }
        const path = event.path.replace("/.netlify/functions/user-data", "").replace("/api/user-data", "");
        const method = event.httpMethod;
        const body = event.body ? JSON.parse(event.body) : {};
        // CSRF verification for state-changing operations
        if (["POST", "PUT", "DELETE"].includes(method)) {
            const csrfToken = event.headers["x-csrf-token"];
            if (!csrfToken || !(0, csrf_utils_1.verifyCsrfToken)(csrfToken)) {
                return cors.response(403, { error: "Invalid CSRF token" });
            }
        }
        // ==================== HEALTH PROFILE ====================
        if (path === "/health-profile" || path === "/health-profile/") {
            if (method === "GET") {
                return await getHealthProfile(user.userId);
            }
            else if (method === "POST" || method === "PUT") {
                return await saveHealthProfile(user.userId, body);
            }
        }
        // ==================== PREFERENCES ====================
        if (path === "/preferences" || path === "/preferences/") {
            if (method === "GET") {
                return await getPreferences(user.userId);
            }
            else if (method === "POST" || method === "PUT") {
                return await savePreferences(user.userId, body);
            }
        }
        // ==================== ELIGIBILITY ====================
        if (path === "/eligibility" || path === "/eligibility/") {
            if (method === "GET") {
                return await getEligibility(user.userId);
            }
            else if (method === "POST" || method === "PUT") {
                return await saveEligibility(user.userId, body);
            }
        }
        // ==================== ALL DATA (for migration) ====================
        if (path === "/all" || path === "/all/") {
            if (method === "GET") {
                const [healthResult, prefsResult, eligResult] = await Promise.all([
                    getHealthProfileData(user.userId),
                    getPreferencesData(user.userId),
                    getEligibilityData(user.userId),
                ]);
                return cors.response(200, {
                    healthProfile: healthResult,
                    preferences: prefsResult,
                    eligibility: eligResult,
                });
            }
        }
        return cors.response(404, { error: "Not found" });
    }
    catch (error) {
        console.error("User data API error:", error);
        return cors.response(500, { error: error instanceof Error ? error.message : "Internal server error" });
    }
};
exports.handler = handler;
// ============================================================================
// Health Profile Operations
// ============================================================================
async function getHealthProfileData(userId) {
    const result = await (0, db_1.query)(`SELECT * FROM health_profiles WHERE user_id = $1`, [userId]);
    if (result.rows.length === 0) {
        return null;
    }
    const row = result.rows[0];
    return {
        age: row.age,
        weight: row.weight ? parseFloat(row.weight) : undefined,
        gender: row.gender,
        race: row.race,
        language: row.language,
        bloodGroup: row.blood_group,
        genotype: row.genotype,
        primaryCondition: row.primary_condition,
        additionalInfo: row.additional_info,
        ecog: row.ecog,
        diseaseStage: row.disease_stage,
        biomarkers: row.biomarkers,
        priorTherapies: row.prior_therapies || [],
        medications: row.medications || [],
        allergies: row.allergies || [],
        comorbidityCardiac: row.comorbidity_cardiac,
        comorbidityRenal: row.comorbidity_renal,
        comorbidityHepatic: row.comorbidity_hepatic,
        comorbidityAutoimmune: row.comorbidity_autoimmune,
        infectionHIV: row.infection_hiv,
        infectionHBV: row.infection_hbv,
        infectionHCV: row.infection_hcv,
    };
}
async function getHealthProfile(userId) {
    const profile = await getHealthProfileData(userId);
    return cors.response(200, { profile });
}
async function saveHealthProfile(userId, profile) {
    await (0, db_1.query)(`INSERT INTO health_profiles (
      user_id, age, weight, gender, race, language, blood_group, genotype,
      primary_condition, additional_info, ecog, disease_stage, biomarkers,
      prior_therapies, medications, allergies,
      comorbidity_cardiac, comorbidity_renal, comorbidity_hepatic, comorbidity_autoimmune,
      infection_hiv, infection_hbv, infection_hcv, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      age = EXCLUDED.age,
      weight = EXCLUDED.weight,
      gender = EXCLUDED.gender,
      race = EXCLUDED.race,
      language = EXCLUDED.language,
      blood_group = EXCLUDED.blood_group,
      genotype = EXCLUDED.genotype,
      primary_condition = EXCLUDED.primary_condition,
      additional_info = EXCLUDED.additional_info,
      ecog = EXCLUDED.ecog,
      disease_stage = EXCLUDED.disease_stage,
      biomarkers = EXCLUDED.biomarkers,
      prior_therapies = EXCLUDED.prior_therapies,
      medications = EXCLUDED.medications,
      allergies = EXCLUDED.allergies,
      comorbidity_cardiac = EXCLUDED.comorbidity_cardiac,
      comorbidity_renal = EXCLUDED.comorbidity_renal,
      comorbidity_hepatic = EXCLUDED.comorbidity_hepatic,
      comorbidity_autoimmune = EXCLUDED.comorbidity_autoimmune,
      infection_hiv = EXCLUDED.infection_hiv,
      infection_hbv = EXCLUDED.infection_hbv,
      infection_hcv = EXCLUDED.infection_hcv,
      updated_at = CURRENT_TIMESTAMP`, [
        userId,
        profile.age || null,
        profile.weight || null,
        profile.gender || null,
        profile.race || null,
        profile.language || null,
        profile.bloodGroup || null,
        profile.genotype || null,
        profile.primaryCondition || null,
        profile.additionalInfo || null,
        profile.ecog || null,
        profile.diseaseStage || null,
        profile.biomarkers || null,
        JSON.stringify(profile.priorTherapies || []),
        JSON.stringify(profile.medications || []),
        JSON.stringify(profile.allergies || []),
        profile.comorbidityCardiac || false,
        profile.comorbidityRenal || false,
        profile.comorbidityHepatic || false,
        profile.comorbidityAutoimmune || false,
        profile.infectionHIV || false,
        profile.infectionHBV || false,
        profile.infectionHCV || false,
    ]);
    return cors.response(200, { ok: true });
}
// ============================================================================
// Preferences Operations
// ============================================================================
async function getPreferencesData(userId) {
    const result = await (0, db_1.query)(`SELECT * FROM user_preferences WHERE user_id = $1`, [userId]);
    if (result.rows.length === 0) {
        return null;
    }
    const row = result.rows[0];
    return {
        notifyEmail: row.notify_email,
        notifyTrials: row.notify_trials,
        notifyNews: row.notify_news,
        consent: {
            section1: row.consent_section1,
            section2: row.consent_section2,
            section3: row.consent_section3,
            section4: row.consent_section4,
            final: row.consent_final,
        },
    };
}
async function getPreferences(userId) {
    const preferences = await getPreferencesData(userId);
    return cors.response(200, { preferences });
}
async function savePreferences(userId, prefs) {
    await (0, db_1.query)(`INSERT INTO user_preferences (
      user_id, notify_email, notify_trials, notify_news,
      consent_section1, consent_section2, consent_section3, consent_section4, consent_final,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      notify_email = COALESCE(EXCLUDED.notify_email, user_preferences.notify_email),
      notify_trials = COALESCE(EXCLUDED.notify_trials, user_preferences.notify_trials),
      notify_news = COALESCE(EXCLUDED.notify_news, user_preferences.notify_news),
      consent_section1 = COALESCE(EXCLUDED.consent_section1, user_preferences.consent_section1),
      consent_section2 = COALESCE(EXCLUDED.consent_section2, user_preferences.consent_section2),
      consent_section3 = COALESCE(EXCLUDED.consent_section3, user_preferences.consent_section3),
      consent_section4 = COALESCE(EXCLUDED.consent_section4, user_preferences.consent_section4),
      consent_final = COALESCE(EXCLUDED.consent_final, user_preferences.consent_final),
      updated_at = CURRENT_TIMESTAMP`, [
        userId,
        prefs.notifyEmail ?? null,
        prefs.notifyTrials ?? null,
        prefs.notifyNews ?? null,
        prefs.consent?.section1 ?? null,
        prefs.consent?.section2 ?? null,
        prefs.consent?.section3 ?? null,
        prefs.consent?.section4 ?? null,
        prefs.consent?.final ?? null,
    ]);
    return cors.response(200, { ok: true });
}
// ============================================================================
// Eligibility Operations
// ============================================================================
async function getEligibilityData(userId) {
    const result = await (0, db_1.query)(`SELECT * FROM eligibility_profiles WHERE user_id = $1`, [userId]);
    if (result.rows.length === 0) {
        return null;
    }
    const row = result.rows[0];
    return {
        dob: row.dob ? row.dob.toISOString().split('T')[0] : undefined,
        age: row.age,
        weight: row.weight ? parseFloat(row.weight) : undefined,
        gender: row.gender,
        race: row.race,
        language: row.language,
        loc: row.location,
        radius: row.radius,
    };
}
async function getEligibility(userId) {
    const eligibility = await getEligibilityData(userId);
    return cors.response(200, { eligibility });
}
async function saveEligibility(userId, elig) {
    await (0, db_1.query)(`INSERT INTO eligibility_profiles (
      user_id, dob, age, weight, gender, race, language, location, radius, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      dob = COALESCE(EXCLUDED.dob, eligibility_profiles.dob),
      age = COALESCE(EXCLUDED.age, eligibility_profiles.age),
      weight = COALESCE(EXCLUDED.weight, eligibility_profiles.weight),
      gender = COALESCE(EXCLUDED.gender, eligibility_profiles.gender),
      race = COALESCE(EXCLUDED.race, eligibility_profiles.race),
      language = COALESCE(EXCLUDED.language, eligibility_profiles.language),
      location = COALESCE(EXCLUDED.location, eligibility_profiles.location),
      radius = COALESCE(EXCLUDED.radius, eligibility_profiles.radius),
      updated_at = CURRENT_TIMESTAMP`, [
        userId,
        elig.dob || null,
        elig.age || null,
        elig.weight || null,
        elig.gender || null,
        elig.race || null,
        elig.language || null,
        elig.loc || null,
        elig.radius || null,
    ]);
    return cors.response(200, { ok: true });
}
