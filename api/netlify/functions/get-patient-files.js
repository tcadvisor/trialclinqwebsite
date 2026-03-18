"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const azure_storage_1 = require("./azure-storage");
const db_1 = require("./db");
const auth_utils_1 = require("./auth-utils");
const cors_utils_1 = require("./cors-utils");
const PATIENT_ID_REGEX = /^[A-Za-z0-9._-]+$/;
const handler = async (event) => {
    const cors = (0, cors_utils_1.createCorsHandler)(event);
    if (event.httpMethod === "OPTIONS") {
        return cors.handleOptions("GET,OPTIONS");
    }
    if (event.httpMethod !== "GET") {
        return cors.response(405, { error: "Method not allowed" });
    }
    const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
    if (!authHeader) {
        return cors.response(401, { error: "Missing Authorization header" });
    }
    try {
        // Authenticate user and ensure database presence
        const authenticatedUser = await (0, auth_utils_1.getUserFromAuthHeader)(authHeader);
        await (0, db_1.getOrCreateUser)(authenticatedUser.userId, authenticatedUser.email, authenticatedUser.oid, authenticatedUser.firstName, authenticatedUser.lastName, authenticatedUser.role);
        const patientId = event.queryStringParameters?.patientId?.trim();
        if (!patientId) {
            return cors.response(400, { error: "Missing patientId query parameter" });
        }
        if (!PATIENT_ID_REGEX.test(patientId)) {
            return cors.response(400, { error: "Invalid patientId format" });
        }
        // Patients can only see their own files
        if (authenticatedUser.role === "patient" && !(0, auth_utils_1.canAccessPatient)(authenticatedUser, patientId)) {
            await (0, db_1.logAuditEvent)(authenticatedUser.userId, "UNAUTHORIZED_FILE_LIST", "patient_document", undefined, patientId, { reason: "User attempted to list files for another user" }, event.headers?.["x-forwarded-for"] || event.headers?.["x-client-ip"], event.headers?.["user-agent"]);
            return cors.response(403, { error: "Unauthorized: You can only view your own files" });
        }
        // Get files from database
        const result = await (0, db_1.query)(`
      SELECT id, file_name, file_size, blob_url, blob_path, uploaded_at, uploaded_by_user_id
      FROM patient_documents
      WHERE patient_id = $1
      ORDER BY uploaded_at DESC;
      `, [patientId]);
        const sasFailures = [];
        const files = await Promise.all(result.rows.map(async (row) => {
            try {
                // Generate temporary access URL with expiry
                const sasUrl = await (0, azure_storage_1.generateFileAccessUrl)(row.blob_path || row.blob_url || `${patientId}/${row.file_name}`, 24 // 24 hour expiry
                );
                return {
                    id: row.id,
                    name: row.file_name,
                    size: row.file_size,
                    uploadedAt: row.uploaded_at,
                    url: sasUrl, // Use SAS URL instead of direct URL
                    blobPath: row.blob_path || undefined,
                    uploadedBy: row.uploaded_by_user_id || undefined,
                };
            }
            catch (error) {
                sasFailures.push(row.id || row.file_name);
                // Fallback to direct URL if SAS generation fails
                return {
                    id: row.id,
                    name: row.file_name,
                    size: row.file_size,
                    uploadedAt: row.uploaded_at,
                    url: row.blob_url,
                    blobPath: row.blob_path || undefined,
                    uploadedBy: row.uploaded_by_user_id || undefined,
                };
            }
        }));
        await (0, db_1.logAuditEvent)(authenticatedUser.userId, "FILES_LIST_VIEWED", "patient_document", undefined, patientId, { count: files.length, sas_failures: sasFailures.length || undefined }, event.headers?.["x-forwarded-for"] || event.headers?.["x-client-ip"], event.headers?.["user-agent"]);
        console.log("✅ Patient files retrieved:", {
            patientId,
            count: files.length,
        });
        return cors.response(200, {
            ok: true,
            patientId,
            files,
            warnings: sasFailures.length ? { sasGenerationFailedFor: sasFailures } : undefined,
            count: files.length,
        });
    }
    catch (error) {
        console.error("❌ Error retrieving files:", error);
        return cors.response(500, {
            error: error.message || "Failed to retrieve files",
        });
    }
};
exports.handler = handler;
