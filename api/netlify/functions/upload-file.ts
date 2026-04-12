import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import Busboy from "busboy";
import { uploadFileToBlob } from "./azure-storage";
import { query, getOrCreateUser, logAuditEvent } from "./db";
import { getUserFromAuthHeader, canAccessPatient } from "./auth-utils";
import { validateCsrfToken, getCsrfTokenFromHeaders } from "./csrf-utils";
import { createCorsHandler } from "./cors-utils";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB per file
const MAX_FILES_PER_REQUEST = 5;
const ALLOWED_MIMES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const PATIENT_ID_REGEX = /^[A-Za-z0-9._-]+$/;

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("POST,OPTIONS");
  }

  if (event.httpMethod !== "POST") {
    return cors.response(405, { error: "Method not allowed" });
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  if (!authHeader) {
    return cors.response(401, { error: "Missing Authorization header" });
  }

  // CSRF Protection: Validate CSRF token for state-changing operations
  const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
  if (!csrfToken) {
    console.warn("CSRF validation failed: Missing CSRF token");
    return cors.response(403, { error: "Missing CSRF token" });
  }

  if (!validateCsrfToken(csrfToken)) {
    console.warn("CSRF validation failed: Invalid or expired CSRF token");
    return cors.response(403, { error: "Invalid or expired CSRF token" });
  }

  return new Promise((resolve) => {
    try {
      const bb = Busboy({
        headers: event.headers as any,
        limits: {
          fileSize: MAX_FILE_BYTES,
          files: MAX_FILES_PER_REQUEST,
        },
      });

      let patientId = "";
      const uploadedFiles: any[] = [];
      const fileBuffers: { fieldname: string; filename: string; buffer: Buffer; mimetype: string; size: number }[] = [];
      const skippedInvalidType: string[] = [];
      const skippedOversized: string[] = [];
      let filesLimitHit = false;

      bb.on("field", (fieldname: string, val: string) => {
        if (fieldname === "patientId") {
          patientId = val;
        }
      });

      bb.on("file", (fieldname: string, file: any, info: any) => {
        const { filename, mimeType } = info;
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        let exceededSize = false;

        if (!ALLOWED_MIMES.has(mimeType)) {
          skippedInvalidType.push(filename);
          file.resume();
          return;
        }

        file.on("data", (data: Buffer) => {
          totalBytes += data.length;
          if (totalBytes <= MAX_FILE_BYTES) {
            chunks.push(data);
          } else {
            exceededSize = true;
          }
        });

        file.on("limit", () => {
          exceededSize = true;
        });

        file.on("end", () => {
          if (exceededSize) {
            skippedOversized.push(filename);
            return;
          }

          const buffer = Buffer.concat(chunks);
          fileBuffers.push({
            fieldname,
            filename,
            buffer,
            mimetype: mimeType,
            size: buffer.length,
          });
        });
      });

      bb.on("filesLimit", () => {
        filesLimitHit = true;
      });

      bb.on("close", async () => {
        try {
          if (!patientId) {
            return resolve(cors.response(400, { error: "Missing patientId" }));
          }

          if (!PATIENT_ID_REGEX.test(patientId)) {
            return resolve(cors.response(400, { error: "Invalid patientId format" }));
          }

          if (fileBuffers.length === 0) {
            const warnings: Record<string, any> = {};
            if (filesLimitHit) warnings.maxFilesExceeded = { limit: MAX_FILES_PER_REQUEST };
            if (skippedInvalidType.length) warnings.unsupportedFiles = skippedInvalidType;
            if (skippedOversized.length) warnings.oversizedFiles = skippedOversized;

            return resolve(cors.response(400, { error: "No files provided", warnings: Object.keys(warnings).length ? warnings : undefined }));
          }

          // Authenticate user
          try {
            var authenticatedUser = await getUserFromAuthHeader(authHeader, event.headers?.cookie);
          } catch (authError: any) {
            return resolve(cors.response(401, { error: authError.message || "Unauthorized" }));
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
            return resolve(cors.response(403, { error: "Unauthorized: You can only upload files for your own profile" }));
          }

          // Upload each file to Azure Blob Storage
          const warnings: Record<string, any> = {};
          if (filesLimitHit) warnings.maxFilesExceeded = { limit: MAX_FILES_PER_REQUEST };
          if (skippedInvalidType.length) warnings.unsupportedFiles = skippedInvalidType;
          if (skippedOversized.length) warnings.oversizedFiles = skippedOversized;
          const warningsPayload = Object.keys(warnings).length ? warnings : undefined;

          for (const fileData of fileBuffers) {
            try {
              const { blobName, blobUrl, safeFileName } = await uploadFileToBlob(
                patientId,
                fileData.filename,
                fileData.buffer,
                fileData.mimetype
              );

              // Record file metadata in database with user tracking
              await query(
                `
                INSERT INTO patient_documents (
                  patient_id, user_id, file_name, file_type, file_size, blob_url, blob_path, blob_container, uploaded_by_user_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW());
                `,
                [patientId, authenticatedUser.userId, safeFileName, fileData.mimetype, fileData.size, blobUrl, blobName, "medical-documents", authenticatedUser.userId]
              );

              uploadedFiles.push({
                filename: safeFileName,
                size: fileData.size,
                url: blobUrl,
                blobName,
              });

              console.log("✅ File uploaded successfully:", {
                patientId,
                filename: safeFileName,
                size: fileData.size,
              });
            } catch (error: any) {
              console.error("❌ File upload failed:", error.message);
            }
          }

          if (uploadedFiles.length === 0) {
            return resolve(cors.response(400, { error: "No files were successfully uploaded", warnings: warningsPayload }));
          }

          // Log audit event for successful upload
          await logAuditEvent(
            authenticatedUser.userId,
            'FILES_UPLOADED',
            'patient_document',
            patientId,
            patientId,
            {
              file_count: uploadedFiles.length,
              total_size: uploadedFiles.reduce((sum: number, f: any) => sum + f.size, 0),
              warnings: warningsPayload
            },
            event.headers?.['x-forwarded-for'] || event.headers?.['x-client-ip'],
            event.headers?.['user-agent']
          );

          return resolve(cors.response(200, {
            ok: true,
            message: "Files uploaded successfully",
            files: uploadedFiles,
            warnings: warningsPayload,
            uploadedBy: authenticatedUser.userId,
          }));
        } catch (error: any) {
          console.error("❌ Upload error:", error);
          return resolve(cors.response(500, {
            error: error.message || "Failed to upload files",
          }));
        }
      });

      bb.on("error", (error: any) => {
        console.error("❌ Busboy error:", error);
        return resolve(cors.response(400, { error: "Invalid request format" }));
      });

      if (event.body) {
        bb.write(Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8"));
      }
      bb.end();
    } catch (error: any) {
      console.error("❌ Handler error:", error);
      return resolve(cors.response(500, { error: error.message || "Internal server error" }));
    }
  });
};
