"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const db_1 = require("./db");
const csrf_utils_1 = require("./csrf-utils");
const cors_utils_1 = require("./cors-utils");
const handler = async (event, context) => {
    const cors = (0, cors_utils_1.createCorsHandler)(event);
    console.log("=== Express Interest Request ===");
    console.log("Method:", event.httpMethod);
    console.log("Headers:", Object.keys(event.headers || {}));
    try {
        // OPTIONS request
        if (event.httpMethod === "OPTIONS") {
            return cors.handleOptions("POST,OPTIONS");
        }
        // Only allow POST
        if (event.httpMethod !== "POST") {
            return cors.response(405, { ok: false, message: "Method not allowed" });
        }
        // CSRF Protection: Validate CSRF token for state-changing operations
        const csrfToken = (0, csrf_utils_1.getCsrfTokenFromHeaders)(event.headers);
        if (!csrfToken) {
            console.warn("CSRF validation failed: Missing CSRF token");
            return cors.response(403, { ok: false, message: "Missing CSRF token" });
        }
        if (!(0, csrf_utils_1.validateCsrfToken)(csrfToken)) {
            console.warn("CSRF validation failed: Invalid or expired CSRF token");
            return cors.response(403, { ok: false, message: "Invalid or expired CSRF token" });
        }
        // Initialize database
        try {
            console.log("Initializing database...");
            await (0, db_1.initializeDatabase)();
            console.log("Database initialized");
        }
        catch (err) {
            console.warn("Database init warning:", err instanceof Error ? err.message : String(err));
        }
        // Get auth from headers
        const userId = event.headers["x-user-id"];
        const patientId = event.headers["x-patient-id"];
        console.log("Auth check - userId:", !!userId, "patientId:", !!patientId);
        if (!userId || !patientId) {
            return cors.response(401, { ok: false, message: "Missing x-user-id or x-patient-id header" });
        }
        // Parse request body
        let nctId = "";
        let trialTitle = "";
        try {
            const body = JSON.parse(event.body || "{}");
            nctId = body.nctId || "";
            trialTitle = body.trialTitle || "";
        }
        catch (parseErr) {
            console.error("Failed to parse request body:", parseErr);
            return cors.response(400, { ok: false, message: "Invalid JSON in request body" });
        }
        console.log("Request data - nctId:", nctId, "trialTitle:", trialTitle ? trialTitle.substring(0, 50) : "");
        // Validate NCT ID format
        if (!nctId || !nctId.match(/^NCT\d{8}$/)) {
            return cors.response(400, { ok: false, message: `Invalid NCT ID format: ${nctId}` });
        }
        const nctIdUpper = nctId.toUpperCase();
        // Check if already interested
        console.log("Checking existing interest for patient:", patientId, "trial:", nctIdUpper);
        try {
            const existing = await (0, db_1.query)("SELECT id FROM trial_interests WHERE patient_id = $1 AND nct_id = $2", [patientId, nctIdUpper]);
            if (existing?.rows?.length > 0) {
                console.log("Patient already interested");
                return cors.response(200, {
                    ok: true,
                    message: "Interest already expressed",
                    alreadyInterested: true,
                });
            }
        }
        catch (checkErr) {
            console.warn("Error checking existing interest:", checkErr.message);
            // Continue - table might not exist yet
        }
        // Insert new interest
        console.log("Inserting new trial interest...");
        try {
            const result = await (0, db_1.query)(`INSERT INTO trial_interests (patient_id, user_id, nct_id, trial_title, expressed_at, created_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, patient_id, nct_id, trial_title, expressed_at`, [patientId, userId, nctIdUpper, trialTitle || null]);
            console.log("Interest inserted successfully, id:", result?.rows?.[0]?.id);
            // Log audit event (non-blocking)
            try {
                await (0, db_1.logAuditEvent)(userId, "PATIENT_EXPRESS_INTEREST", "trial_interest", result.rows[0].id, patientId, { nctId: nctIdUpper, trialTitle });
            }
            catch (auditErr) {
                console.warn("Audit log failed (non-blocking):", auditErr instanceof Error ? auditErr.message : String(auditErr));
            }
            return cors.response(201, {
                ok: true,
                message: "Interest expressed successfully",
                data: result.rows[0],
            });
        }
        catch (insertErr) {
            console.error("Database insert error:", insertErr);
            return cors.response(500, { ok: false, message: `Database error: ${insertErr.message || "Insert failed"}` });
        }
    }
    catch (err) {
        console.error("Unexpected error:", err);
        return cors.response(500, { ok: false, message: err.message || "Internal server error" });
    }
};
exports.handler = handler;
