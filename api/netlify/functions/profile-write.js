"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const db_1 = require("./db");
const auth_utils_1 = require("./auth-utils");
const csrf_utils_1 = require("./csrf-utils");
const cors_utils_1 = require("./cors-utils");
const handler = async (event) => {
    const cors = (0, cors_utils_1.createCorsHandler)(event);
    if (event.httpMethod === "OPTIONS") {
        return cors.handleOptions("POST,PUT,OPTIONS");
    }
    if (event.httpMethod !== "PUT" && event.httpMethod !== "POST") {
        return cors.response(405, { error: "Method not allowed" });
    }
    const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
    if (!authHeader) {
        return cors.response(401, { error: "Missing Authorization header" });
    }
    // CSRF Protection: Validate CSRF token for state-changing operations
    const csrfToken = (0, csrf_utils_1.getCsrfTokenFromHeaders)(event.headers);
    if (!csrfToken) {
        console.warn("CSRF validation failed: Missing CSRF token");
        return cors.response(403, { error: "Missing CSRF token" });
    }
    if (!(0, csrf_utils_1.validateCsrfToken)(csrfToken)) {
        console.warn("CSRF validation failed: Invalid or expired CSRF token");
        return cors.response(403, { error: "Invalid or expired CSRF token" });
    }
    try {
        // Authenticate user from Azure Entra ID token
        const authenticatedUser = await (0, auth_utils_1.getUserFromAuthHeader)(authHeader);
        // Ensure user exists in database
        await (0, db_1.getOrCreateUser)(authenticatedUser.userId, authenticatedUser.email, authenticatedUser.oid, authenticatedUser.firstName, authenticatedUser.lastName, authenticatedUser.role);
        const payload = event.body ? JSON.parse(event.body) : {};
        const { patientId, email, emailVerified, age, weight, phone, gender, race, language, bloodGroup, genotype, hearingImpaired, visionImpaired, primaryCondition, diagnosed, allergies, medications, additionalInfo, additionalInformationAppendMarkdown, ecog, diseaseStage, biomarkers, priorTherapies, comorbidityCardiac, comorbidityRenal, comorbidityHepatic, comorbidityAutoimmune, infectionHIV, infectionHBV, infectionHCV, } = payload;
        if (!patientId || !email) {
            return cors.response(400, { error: "Missing patientId or email" });
        }
        // AUTHORIZATION CHECK: Ensure user can only modify their own profile
        // Patients can only update their own profile
        if (authenticatedUser.role === 'patient' && !(0, auth_utils_1.canAccessPatient)(authenticatedUser, patientId)) {
            await (0, db_1.logAuditEvent)(authenticatedUser.userId, 'UNAUTHORIZED_ACCESS', 'patient_profile', patientId, patientId, { reason: 'User attempted to access another user\'s profile' }, event.headers?.['x-forwarded-for'] || event.headers?.['x-client-ip'], event.headers?.['user-agent']);
            return cors.response(403, { error: "Unauthorized: You can only update your own profile" });
        }
        // Combine additionalInfo and appendMarkdown
        const finalAdditionalInfo = [
            additionalInfo || "",
            additionalInformationAppendMarkdown || ""
        ].filter(Boolean).join("\n\n");
        // Insert or update patient profile in PostgreSQL with user tracking
        const result = await (0, db_1.query)(`
      INSERT INTO patient_profiles (
        patient_id, user_id, email, email_verified, age, weight, phone, gender, race, language,
        blood_group, genotype, hearing_impaired, vision_impaired, primary_condition,
        diagnosed, allergies, medications, additional_info, ecog, disease_stage,
        biomarkers, prior_therapies, comorbidity_cardiac, comorbidity_renal,
        comorbidity_hepatic, comorbidity_autoimmune, infection_hiv, infection_hbv,
        infection_hcv, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, NOW(), NOW())
      ON CONFLICT (patient_id) DO UPDATE SET
        user_id = $2,
        email = $3,
        email_verified = $4,
        age = $5,
        weight = $6,
        phone = $7,
        gender = $8,
        race = $9,
        language = $10,
        blood_group = $11,
        genotype = $12,
        hearing_impaired = $13,
        vision_impaired = $14,
        primary_condition = $15,
        diagnosed = $16,
        allergies = $17,
        medications = $18,
        additional_info = $19,
        ecog = $20,
        disease_stage = $21,
        biomarkers = $22,
        prior_therapies = $23,
        comorbidity_cardiac = $24,
        comorbidity_renal = $25,
        comorbidity_hepatic = $26,
        comorbidity_autoimmune = $27,
        infection_hiv = $28,
        infection_hbv = $29,
        infection_hcv = $30,
        updated_at = NOW()
      RETURNING id, patient_id, user_id, email;
      `, [
            patientId, authenticatedUser.userId, email, emailVerified || false, age, weight, phone, gender, race, language,
            bloodGroup, genotype, hearingImpaired || false, visionImpaired || false, primaryCondition,
            diagnosed, allergies ? JSON.stringify(allergies) : null, medications ? JSON.stringify(medications) : null,
            finalAdditionalInfo, ecog, diseaseStage, biomarkers,
            priorTherapies ? JSON.stringify(priorTherapies) : null,
            comorbidityCardiac || false, comorbidityRenal || false, comorbidityHepatic || false,
            comorbidityAutoimmune || false, infectionHIV || false, infectionHBV || false, infectionHCV || false
        ]);
        console.log("✅ Patient profile saved to PostgreSQL:", {
            patientId,
            userId: authenticatedUser.userId,
            email,
            rowId: result.rows[0]?.id
        });
        // Log audit event
        await (0, db_1.logAuditEvent)(authenticatedUser.userId, 'PROFILE_UPDATED', 'patient_profile', String(result.rows[0]?.id), patientId, { fields_updated: Object.keys(payload).length }, event.headers?.['x-forwarded-for'] || event.headers?.['x-client-ip'], event.headers?.['user-agent']);
        return cors.response(200, {
            ok: true,
            message: "Profile saved successfully",
            patientId: result.rows[0]?.patient_id,
            userId: result.rows[0]?.user_id,
            email: result.rows[0]?.email
        });
    }
    catch (e) {
        console.error("❌ Error saving profile:", e);
        // Log authentication/authorization errors
        if (e.message?.includes('Unauthorized') || e.message?.includes('Missing Authorization')) {
            try {
                const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
                if (authHeader) {
                    const authenticatedUser = await (0, auth_utils_1.getUserFromAuthHeader)(authHeader).catch(() => null);
                    if (authenticatedUser) {
                        const payload = event.body ? JSON.parse(event.body) : {};
                        await (0, db_1.logAuditEvent)(authenticatedUser.userId, 'PROFILE_UPDATE_FAILED', 'patient_profile', payload?.patientId, payload?.patientId, { error: e.message }, event.headers?.['x-forwarded-for'] || event.headers?.['x-client-ip'], event.headers?.['user-agent']);
                    }
                }
            }
            catch (_) {
                // Ignore logging errors
            }
        }
        return cors.response(e.message?.includes('Unauthorized') ? 401 : 500, {
            error: String(e?.message || e || "Unknown error"),
            details: process.env.NODE_ENV === "development" ? e.stack : undefined
        });
    }
};
exports.handler = handler;
