import type { Handler } from "@netlify/functions";
import { generateFileAccessUrl } from "./azure-storage";
import { query, getOrCreateUser, logAuditEvent } from "./db";
import { getUserFromAuthHeader, canAccessPatient } from "./auth-utils";

const PATIENT_ID_REGEX = /^[A-Za-z0-9._-]+$/;

function cors(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      "content-type": "application/json",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return cors(204, "");
  }

  if (event.httpMethod !== "GET") {
    return cors(405, { error: "Method not allowed" });
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  if (!authHeader) {
    return cors(401, { error: "Missing Authorization header" });
  }

  try {
    // Authenticate user and ensure database presence
    const authenticatedUser = await getUserFromAuthHeader(authHeader);
    await getOrCreateUser(
      authenticatedUser.userId,
      authenticatedUser.email,
      authenticatedUser.oid,
      authenticatedUser.firstName,
      authenticatedUser.lastName,
      authenticatedUser.role
    );

    const patientId = event.queryStringParameters?.patientId?.trim();
    if (!patientId) {
      return cors(400, { error: "Missing patientId query parameter" });
    }

    if (!PATIENT_ID_REGEX.test(patientId)) {
      return cors(400, { error: "Invalid patientId format" });
    }

    // Patients can only see their own files
    if (authenticatedUser.role === "patient" && !canAccessPatient(authenticatedUser, patientId)) {
      await logAuditEvent(
        authenticatedUser.userId,
        "UNAUTHORIZED_FILE_LIST",
        "patient_document",
        undefined,
        patientId,
        { reason: "User attempted to list files for another user" },
        event.headers?.["x-forwarded-for"] || event.headers?.["x-client-ip"],
        event.headers?.["user-agent"]
      );
      return cors(403, { error: "Unauthorized: You can only view your own files" });
    }

    // Get files from database
    const result = await query(
      `
      SELECT id, file_name, file_size, blob_url, blob_path, uploaded_at, uploaded_by_user_id
      FROM patient_documents
      WHERE patient_id = $1
      ORDER BY uploaded_at DESC;
      `,
      [patientId]
    );

    const sasFailures: Array<string | number> = [];
    const files = await Promise.all(
      result.rows.map(async (row: any) => {
        try {
          // Generate temporary access URL with expiry
          const sasUrl = await generateFileAccessUrl(
            row.blob_path || row.blob_url || `${patientId}/${row.file_name}`,
            24 // 24 hour expiry
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
        } catch (error) {
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
      })
    );

    await logAuditEvent(
      authenticatedUser.userId,
      "FILES_LIST_VIEWED",
      "patient_document",
      undefined,
      patientId,
      { count: files.length, sas_failures: sasFailures.length || undefined },
      event.headers?.["x-forwarded-for"] || event.headers?.["x-client-ip"],
      event.headers?.["user-agent"]
    );

    console.log("✅ Patient files retrieved:", {
      patientId,
      count: files.length,
    });

    return cors(200, {
      ok: true,
      patientId,
      files,
      warnings: sasFailures.length ? { sasGenerationFailedFor: sasFailures } : undefined,
      count: files.length,
    });
  } catch (error: any) {
    console.error("❌ Error retrieving files:", error);
    return cors(500, {
      error: error.message || "Failed to retrieve files",
    });
  }
};
