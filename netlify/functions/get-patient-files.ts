import type { Handler } from "@netlify/functions";
import { listPatientFiles, generateFileAccessUrl } from "./azure-storage";
import { query } from "./db";

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
    const patientId = event.queryStringParameters?.patientId;
    if (!patientId) {
      return cors(400, { error: "Missing patientId query parameter" });
    }

    // Get files from database
    const result = await query(
      `
      SELECT id, file_name, file_size, blob_url, uploaded_at
      FROM patient_documents
      WHERE patient_id = $1
      ORDER BY uploaded_at DESC;
      `,
      [patientId]
    );

    const files = await Promise.all(
      result.rows.map(async (row: any) => {
        try {
          // Generate temporary access URL with expiry
          const sasUrl = await generateFileAccessUrl(
            `${patientId}/${row.file_name}`,
            24 // 24 hour expiry
          );

          return {
            id: row.id,
            name: row.file_name,
            size: row.file_size,
            uploadedAt: row.uploaded_at,
            url: sasUrl, // Use SAS URL instead of direct URL
          };
        } catch (error) {
          // Fallback to direct URL if SAS generation fails
          return {
            id: row.id,
            name: row.file_name,
            size: row.file_size,
            uploadedAt: row.uploaded_at,
            url: row.blob_url,
          };
        }
      })
    );

    console.log("✅ Patient files retrieved:", {
      patientId,
      count: files.length,
    });

    return cors(200, {
      ok: true,
      patientId,
      files,
      count: files.length,
    });
  } catch (error: any) {
    console.error("❌ Error retrieving files:", error);
    return cors(500, {
      error: error.message || "Failed to retrieve files",
    });
  }
};
