"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const db_1 = require("./db");
const cors_utils_1 = require("./cors-utils");
const handler = async (event, context) => {
    const cors = (0, cors_utils_1.createCorsHandler)(event);
    console.log("=== Get Trial Interests Request ===");
    console.log("Method:", event.httpMethod);
    try {
        // OPTIONS request
        if (event.httpMethod === "OPTIONS") {
            return cors.handleOptions("GET,OPTIONS");
        }
        // Only allow GET
        if (event.httpMethod !== "GET") {
            return cors.response(405, { ok: false, message: "Method not allowed" });
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
        console.log("Auth check - userId:", !!userId);
        if (!userId) {
            return cors.response(401, { ok: false, message: "Missing x-user-id header" });
        }
        // Get NCT ID from query params
        const nctId = event.queryStringParameters?.nctId;
        console.log("Query params - nctId:", nctId);
        if (!nctId || !nctId.match(/^NCT\d{8}$/)) {
            return cors.response(400, { ok: false, message: `Invalid NCT ID format: ${nctId}` });
        }
        const nctIdUpper = nctId.toUpperCase();
        // Fetch interested patients
        console.log("Fetching interested patients for trial:", nctIdUpper);
        try {
            const result = await (0, db_1.query)(`SELECT
          ti.id,
          ti.patient_id as "patientId",
          ti.nct_id as "nctId",
          ti.trial_title as "trialTitle",
          ti.expressed_at as "expressedAt",
          pp.email,
          pp.age,
          pp.gender,
          pp.primary_condition as "primaryCondition",
          pp.phone
         FROM trial_interests ti
         LEFT JOIN patient_profiles pp ON ti.patient_id = pp.patient_id
         WHERE ti.nct_id = $1
         ORDER BY ti.expressed_at DESC`, [nctIdUpper]);
            console.log("Found interested patients:", result?.rows?.length || 0);
            return cors.response(200, {
                ok: true,
                nctId: nctIdUpper,
                count: result?.rows?.length || 0,
                interestedPatients: result?.rows || [],
            });
        }
        catch (dbErr) {
            console.error("Database error fetching trial interests:", dbErr);
            return cors.response(500, { ok: false, message: `Database error: ${dbErr.message || "Query failed"}` });
        }
    }
    catch (err) {
        console.error("Unexpected error:", err);
        return cors.response(500, { ok: false, message: err.message || "Internal server error" });
    }
};
exports.handler = handler;
