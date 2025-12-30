import { Handler } from "@netlify/functions";
import { query, logAuditEvent, initializeDatabase } from "./db";

interface RequestBody {
  nctId: string;
  trialTitle?: string;
  patientId?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const errorResponse = (statusCode: number, message: string) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify({
    ok: false,
    message,
  }),
});

const successResponse = (statusCode: number, data: any) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(data),
});

const handler: Handler = async (event, context) => {
  console.log("=== Express Interest Request ===");
  console.log("Method:", event.httpMethod);
  console.log("Headers:", Object.keys(event.headers || {}));

  try {
    // OPTIONS request
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id, x-patient-id",
        },
        body: JSON.stringify({ ok: true }),
      };
    }

    // Only allow POST
    if (event.httpMethod !== "POST") {
      return errorResponse(405, "Method not allowed");
    }

    // Initialize database
    try {
      console.log("Initializing database...");
      await initializeDatabase();
      console.log("Database initialized");
    } catch (err) {
      console.warn("Database init warning:", err instanceof Error ? err.message : String(err));
    }

    // Get auth from headers
    const userId = event.headers["x-user-id"];
    const patientId = event.headers["x-patient-id"];

    console.log("Auth check - userId:", !!userId, "patientId:", !!patientId);

    if (!userId || !patientId) {
      return errorResponse(401, "Missing x-user-id or x-patient-id header");
    }

    // Parse request body
    let nctId = "";
    let trialTitle = "";
    
    try {
      const body = JSON.parse(event.body || "{}") as RequestBody;
      nctId = body.nctId || "";
      trialTitle = body.trialTitle || "";
    } catch (parseErr) {
      console.error("Failed to parse request body:", parseErr);
      return errorResponse(400, "Invalid JSON in request body");
    }

    console.log("Request data - nctId:", nctId, "trialTitle:", trialTitle ? trialTitle.substring(0, 50) : "");

    // Validate NCT ID format
    if (!nctId || !nctId.match(/^NCT\d{8}$/)) {
      return errorResponse(400, `Invalid NCT ID format: ${nctId}`);
    }

    const nctIdUpper = nctId.toUpperCase();

    // Check if already interested
    console.log("Checking existing interest for patient:", patientId, "trial:", nctIdUpper);
    
    try {
      const existing = await query(
        "SELECT id FROM trial_interests WHERE patient_id = $1 AND nct_id = $2",
        [patientId, nctIdUpper]
      );

      if (existing?.rows?.length > 0) {
        console.log("Patient already interested");
        return successResponse(200, {
          ok: true,
          message: "Interest already expressed",
          alreadyInterested: true,
        });
      }
    } catch (checkErr: any) {
      console.warn("Error checking existing interest:", checkErr.message);
      // Continue - table might not exist yet
    }

    // Insert new interest
    console.log("Inserting new trial interest...");
    
    try {
      const result = await query(
        `INSERT INTO trial_interests (patient_id, user_id, nct_id, trial_title, expressed_at, created_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, patient_id, nct_id, trial_title, expressed_at`,
        [patientId, userId, nctIdUpper, trialTitle || null]
      );

      console.log("Interest inserted successfully, id:", result?.rows?.[0]?.id);

      // Log audit event (non-blocking)
      try {
        await logAuditEvent(
          userId,
          "PATIENT_EXPRESS_INTEREST",
          "trial_interest",
          result.rows[0].id,
          patientId,
          { nctId: nctIdUpper, trialTitle }
        );
      } catch (auditErr) {
        console.warn("Audit log failed (non-blocking):", auditErr instanceof Error ? auditErr.message : String(auditErr));
      }

      return successResponse(201, {
        ok: true,
        message: "Interest expressed successfully",
        data: result.rows[0],
      });
    } catch (insertErr: any) {
      console.error("Database insert error:", insertErr);
      return errorResponse(500, `Database error: ${insertErr.message || "Insert failed"}`);
    }
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return errorResponse(500, err.message || "Internal server error");
  }
};

export { handler };
