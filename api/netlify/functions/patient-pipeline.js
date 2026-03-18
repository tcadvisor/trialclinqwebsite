"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const db_1 = require("./db");
const cors_utils_1 = require("./cors-utils");
const csrf_utils_1 = require("./csrf-utils");
const handler = async (event) => {
    const cors = (0, cors_utils_1.createCorsHandler)(event);
    if (event.httpMethod === "OPTIONS") {
        return cors.handleOptions("GET,POST,PUT,OPTIONS");
    }
    const userId = event.headers["x-user-id"];
    const providerId = event.headers["x-provider-id"] || userId;
    if (!userId) {
        return cors.response(401, { ok: false, error: "Missing x-user-id header" });
    }
    try {
        // GET - Fetch pipeline entries
        if (event.httpMethod === "GET") {
            const { nctId, status, patientId } = event.queryStringParameters || {};
            let sql = `
        SELECT
          pp.id,
          pp.provider_id as "providerId",
          pp.patient_id as "patientId",
          pp.nct_id as "nctId",
          pp.status,
          pp.match_score as "matchScore",
          pp.notes,
          pp.contacted_at as "contactedAt",
          pp.screened_at as "screenedAt",
          pp.enrolled_at as "enrolledAt",
          pp.withdrawn_at as "withdrawnAt",
          pp.withdrawal_reason as "withdrawalReason",
          pp.created_at as "createdAt",
          pp.updated_at as "updatedAt",
          pat.email as "patientEmail",
          pat.age as "patientAge",
          pat.gender as "patientGender",
          pat.primary_condition as "primaryCondition"
        FROM patient_pipeline pp
        LEFT JOIN patient_profiles pat ON pp.patient_id = pat.patient_id
        WHERE pp.provider_id = $1
      `;
            const params = [providerId];
            let paramIndex = 2;
            if (nctId) {
                sql += ` AND pp.nct_id = $${paramIndex}`;
                params.push(nctId.toUpperCase());
                paramIndex++;
            }
            if (status) {
                sql += ` AND pp.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }
            if (patientId) {
                sql += ` AND pp.patient_id = $${paramIndex}`;
                params.push(patientId);
                paramIndex++;
            }
            sql += ` ORDER BY pp.updated_at DESC`;
            const result = await (0, db_1.query)(sql, params);
            // Get status counts for summary
            const countResult = await (0, db_1.query)(`SELECT status, COUNT(*) as count
         FROM patient_pipeline
         WHERE provider_id = $1 ${nctId ? "AND nct_id = $2" : ""}
         GROUP BY status`, nctId ? [providerId, nctId.toUpperCase()] : [providerId]);
            const statusCounts = {};
            for (const row of countResult.rows) {
                statusCounts[row.status] = parseInt(row.count);
            }
            return cors.response(200, {
                ok: true,
                patients: result.rows,
                count: result.rows.length,
                statusCounts,
            });
        }
        // POST - Add patient to pipeline or update status
        if (event.httpMethod === "POST") {
            const csrfToken = (0, csrf_utils_1.getCsrfTokenFromHeaders)(event.headers);
            if (!csrfToken || !(0, csrf_utils_1.validateCsrfToken)(csrfToken)) {
                return cors.response(403, { error: "Invalid CSRF token" });
            }
            const body = event.body ? JSON.parse(event.body) : {};
            const { patientId, nctId, status = "interested", matchScore, notes } = body;
            if (!patientId || !nctId) {
                return cors.response(400, {
                    ok: false,
                    error: "patientId and nctId are required",
                });
            }
            const result = await (0, db_1.query)(`INSERT INTO patient_pipeline (
          provider_id, patient_id, nct_id, status, match_score, notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (provider_id, patient_id, nct_id) DO UPDATE SET
          status = $4,
          match_score = COALESCE($5, patient_pipeline.match_score),
          notes = COALESCE($6, patient_pipeline.notes),
          updated_at = NOW()
        RETURNING id, status`, [providerId, patientId, nctId.toUpperCase(), status, matchScore, notes]);
            await (0, db_1.logAuditEvent)(userId, "PIPELINE_ENTRY_CREATED", "patient_pipeline", `${patientId}-${nctId}`, patientId, { status, nctId }, event.headers?.["x-forwarded-for"], event.headers?.["user-agent"]);
            return cors.response(200, {
                ok: true,
                message: "Patient added to pipeline",
                entry: result.rows[0],
            });
        }
        // PUT - Update pipeline status
        if (event.httpMethod === "PUT") {
            const csrfToken = (0, csrf_utils_1.getCsrfTokenFromHeaders)(event.headers);
            if (!csrfToken || !(0, csrf_utils_1.validateCsrfToken)(csrfToken)) {
                return cors.response(403, { error: "Invalid CSRF token" });
            }
            const body = event.body ? JSON.parse(event.body) : {};
            const { patientId, nctId, status, notes, matchScore, withdrawalReason } = body;
            if (!patientId || !nctId) {
                return cors.response(400, {
                    ok: false,
                    error: "patientId and nctId are required",
                });
            }
            // Build update fields dynamically
            const updateParts = ["updated_at = NOW()"];
            const params = [];
            let paramIndex = 1;
            if (status) {
                updateParts.push(`status = $${paramIndex}`);
                params.push(status);
                paramIndex++;
                // Set timestamp based on status change
                if (status === "contacted") {
                    updateParts.push(`contacted_at = COALESCE(contacted_at, NOW())`);
                }
                else if (status === "screened" || status === "eligible" || status === "ineligible") {
                    updateParts.push(`screened_at = COALESCE(screened_at, NOW())`);
                }
                else if (status === "enrolled") {
                    updateParts.push(`enrolled_at = COALESCE(enrolled_at, NOW())`);
                }
                else if (status === "withdrawn") {
                    updateParts.push(`withdrawn_at = NOW()`);
                }
            }
            if (notes !== undefined) {
                updateParts.push(`notes = $${paramIndex}`);
                params.push(notes);
                paramIndex++;
            }
            if (matchScore !== undefined) {
                updateParts.push(`match_score = $${paramIndex}`);
                params.push(matchScore);
                paramIndex++;
            }
            if (withdrawalReason !== undefined) {
                updateParts.push(`withdrawal_reason = $${paramIndex}`);
                params.push(withdrawalReason);
                paramIndex++;
            }
            params.push(providerId);
            params.push(patientId);
            params.push(nctId.toUpperCase());
            const result = await (0, db_1.query)(`UPDATE patient_pipeline
         SET ${updateParts.join(", ")}
         WHERE provider_id = $${paramIndex} AND patient_id = $${paramIndex + 1} AND nct_id = $${paramIndex + 2}
         RETURNING id, status, updated_at as "updatedAt"`, params);
            if (result.rows.length === 0) {
                return cors.response(404, { ok: false, error: "Pipeline entry not found" });
            }
            await (0, db_1.logAuditEvent)(userId, "PIPELINE_STATUS_UPDATED", "patient_pipeline", `${patientId}-${nctId}`, patientId, { previousStatus: body.previousStatus, newStatus: status }, event.headers?.["x-forwarded-for"], event.headers?.["user-agent"]);
            return cors.response(200, {
                ok: true,
                message: "Pipeline status updated",
                entry: result.rows[0],
            });
        }
        return cors.response(405, { error: "Method not allowed" });
    }
    catch (error) {
        console.error("Patient pipeline error:", error);
        return cors.response(500, {
            ok: false,
            error: error.message || "Internal server error",
        });
    }
};
exports.handler = handler;
