"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const db_1 = require("./db");
const cors_utils_1 = require("./cors-utils");
const csrf_utils_1 = require("./csrf-utils");
const handler = async (event) => {
    const cors = (0, cors_utils_1.createCorsHandler)(event);
    if (event.httpMethod === "OPTIONS") {
        return cors.handleOptions("GET,POST,DELETE,OPTIONS");
    }
    const userId = event.headers["x-user-id"];
    const providerId = event.headers["x-provider-id"] || userId;
    if (!userId) {
        return cors.response(401, { ok: false, error: "Missing x-user-id header" });
    }
    try {
        // GET - Fetch all trials for a provider
        if (event.httpMethod === "GET") {
            const result = await (0, db_1.query)(`SELECT
          id,
          provider_id as "providerId",
          nct_id as "nctId",
          title,
          status,
          phase,
          sponsor,
          conditions,
          nearest_site as "nearestSite",
          enrollment_count as "enrollmentCount",
          start_date as "startDate",
          completion_date as "completionDate",
          added_at as "addedAt"
         FROM provider_trials
         WHERE provider_id = $1
         ORDER BY added_at DESC`, [providerId]);
            return cors.response(200, {
                ok: true,
                trials: result.rows,
                count: result.rows.length,
            });
        }
        // POST - Add a trial to provider's list
        if (event.httpMethod === "POST") {
            const csrfToken = (0, csrf_utils_1.getCsrfTokenFromHeaders)(event.headers);
            if (!csrfToken || !(0, csrf_utils_1.validateCsrfToken)(csrfToken)) {
                return cors.response(403, { error: "Invalid CSRF token" });
            }
            const body = event.body ? JSON.parse(event.body) : {};
            const { nctId, title, status, phase, sponsor, conditions, nearestSite, enrollmentCount, startDate, completionDate } = body;
            if (!nctId) {
                return cors.response(400, { ok: false, error: "nctId is required" });
            }
            const result = await (0, db_1.query)(`INSERT INTO provider_trials (
          provider_id, nct_id, title, status, phase, sponsor, conditions,
          nearest_site, enrollment_count, start_date, completion_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (provider_id, nct_id) DO UPDATE SET
          title = COALESCE($3, provider_trials.title),
          status = COALESCE($4, provider_trials.status),
          phase = COALESCE($5, provider_trials.phase),
          sponsor = COALESCE($6, provider_trials.sponsor),
          conditions = COALESCE($7, provider_trials.conditions),
          nearest_site = COALESCE($8, provider_trials.nearest_site),
          enrollment_count = COALESCE($9, provider_trials.enrollment_count),
          start_date = COALESCE($10, provider_trials.start_date),
          completion_date = COALESCE($11, provider_trials.completion_date),
          updated_at = NOW()
        RETURNING id, nct_id as "nctId"`, [
                providerId,
                nctId.toUpperCase(),
                title,
                status,
                phase,
                sponsor,
                conditions ? JSON.stringify(conditions) : null,
                nearestSite,
                enrollmentCount,
                startDate,
                completionDate,
            ]);
            await (0, db_1.logAuditEvent)(userId, "TRIAL_ADDED", "provider_trial", result.rows[0]?.nctId, undefined, { nctId, title }, event.headers?.["x-forwarded-for"], event.headers?.["user-agent"]);
            return cors.response(200, {
                ok: true,
                message: "Trial added successfully",
                trial: result.rows[0],
            });
        }
        // DELETE - Remove a trial from provider's list
        if (event.httpMethod === "DELETE") {
            const csrfToken = (0, csrf_utils_1.getCsrfTokenFromHeaders)(event.headers);
            if (!csrfToken || !(0, csrf_utils_1.validateCsrfToken)(csrfToken)) {
                return cors.response(403, { error: "Invalid CSRF token" });
            }
            const nctId = event.queryStringParameters?.nctId;
            if (!nctId) {
                return cors.response(400, { ok: false, error: "nctId query parameter is required" });
            }
            await (0, db_1.query)(`DELETE FROM provider_trials WHERE provider_id = $1 AND nct_id = $2`, [providerId, nctId.toUpperCase()]);
            await (0, db_1.logAuditEvent)(userId, "TRIAL_REMOVED", "provider_trial", nctId, undefined, { nctId }, event.headers?.["x-forwarded-for"], event.headers?.["user-agent"]);
            return cors.response(200, {
                ok: true,
                message: "Trial removed successfully",
            });
        }
        return cors.response(405, { error: "Method not allowed" });
    }
    catch (error) {
        console.error("Provider trials error:", error);
        return cors.response(500, {
            ok: false,
            error: error.message || "Internal server error",
        });
    }
};
exports.handler = handler;
