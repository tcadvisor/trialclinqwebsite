import type { Handler } from "@netlify/functions";
import Busboy from "busboy";
import { uploadFileToBlob } from "./azure-storage";
import { query, getOrCreateUser, logAuditEvent } from "./db";
import { getUserFromAuthHeader, canAccessPatient } from "./auth-utils";

function cors(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
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

  if (event.httpMethod !== "POST") {
    return cors(405, { error: "Method not allowed" });
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  if (!authHeader) {
    return cors(401, { error: "Missing Authorization header" });
  }

  return new Promise((resolve) => {
    try {
      const bb = Busboy({
        headers: event.headers as any,
      });

      let patientId = "";
      const uploadedFiles: any[] = [];
      const fileBuffers: { fieldname: string; filename: string; buffer: Buffer; mimetype: string }[] = [];

      bb.on("field", (fieldname: string, val: string) => {
        if (fieldname === "patientId") {
          patientId = val;
        }
      });

      bb.on("file", (fieldname: string, file: any, info: any) => {
        const { filename, encoding, mimeType } = info;
        const chunks: Buffer[] = [];

        file.on("data", (data: Buffer) => {
          chunks.push(data);
        });

        file.on("end", () => {
          const buffer = Buffer.concat(chunks);
          fileBuffers.push({
            fieldname,
            filename,
            buffer,
            mimetype: mimeType,
          });
        });
      });

      bb.on("close", async () => {
        try {
          if (!patientId) {
            return resolve(cors(400, { error: "Missing patientId" }));
          }

          if (fileBuffers.length === 0) {
            return resolve(cors(400, { error: "No files provided" }));
          }

          // Authenticate user
          try {
            var authenticatedUser = await getUserFromAuthHeader(authHeader);
          } catch (authError: any) {
            return resolve(cors(401, { error: authError.message || "Unauthorized" }));
          }

          // Ensure user exists in database
          await getOrCreateUser(
            authenticatedUser.userId,
            authenticatedUser.email,
            authenticatedUser.oid,
            authenticatedUser.firstName,
            authenticatedUser.lastName,
            authenticatedUser.role
          );

          // AUTHORIZATION CHECK: Ensure user can upload files for this patient
          if (authenticatedUser.role === 'patient' && !canAccessPatient(authenticatedUser, patientId)) {
            await logAuditEvent(
              authenticatedUser.userId,
              'UNAUTHORIZED_FILE_UPLOAD',
              'patient_document',
              patientId,
              patientId,
              { reason: 'User attempted to upload files for another user\'s profile' },
              event.headers?.['x-forwarded-for'] || event.headers?.['x-client-ip'],
              event.headers?.['user-agent']
            );
            return resolve(cors(403, { error: "Unauthorized: You can only upload files for your own profile" }));
          }

          // Upload each file to Azure Blob Storage
          for (const fileData of fileBuffers) {
            try {
              // Validate file type
              const allowedMimes = new Set(["application/pdf", "image/png", "image/jpeg"]);
              if (!allowedMimes.has(fileData.mimetype)) {
                continue; // Skip unsupported file types
              }

              const { blobName, blobUrl } = await uploadFileToBlob(
                patientId,
                fileData.filename,
                fileData.buffer,
                fileData.mimetype
              );

              // Record file metadata in database
              await query(
                `
                INSERT INTO patient_documents (
                  patient_id, file_name, file_type, file_size, blob_url, blob_container, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW());
                `,
                [patientId, fileData.filename, fileData.mimetype, fileData.buffer.length, blobUrl, "medical-documents"]
              );

              uploadedFiles.push({
                filename: fileData.filename,
                size: fileData.buffer.length,
                url: blobUrl,
                blobName,
              });

              console.log("✅ File uploaded successfully:", {
                patientId,
                filename: fileData.filename,
                size: fileData.buffer.length,
              });
            } catch (error: any) {
              console.error("❌ File upload failed:", error.message);
            }
          }

          if (uploadedFiles.length === 0) {
            return resolve(cors(400, { error: "No files were successfully uploaded" }));
          }

          return resolve(cors(200, {
            ok: true,
            message: "Files uploaded successfully",
            files: uploadedFiles,
          }));
        } catch (error: any) {
          console.error("❌ Upload error:", error);
          return resolve(cors(500, {
            error: error.message || "Failed to upload files",
          }));
        }
      });

      bb.on("error", (error: any) => {
        console.error("❌ Busboy error:", error);
        return resolve(cors(400, { error: "Invalid request format" }));
      });

      if (event.body) {
        bb.write(Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8"));
      }
      bb.end();
    } catch (error: any) {
      console.error("❌ Handler error:", error);
      return resolve(cors(500, { error: error.message || "Internal server error" }));
    }
  });
};
