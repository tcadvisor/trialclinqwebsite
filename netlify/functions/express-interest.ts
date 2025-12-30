import { Handler } from "@netlify/functions";
import { query, logAuditEvent, initializeDatabase } from "./db";

interface RequestBody {
  nctId: string;
  trialTitle?: string;
  patientId?: string;
}

const handler: Handler = async (event, context) => {
  // Initialize database schema on first call
  try {
    await initializeDatabase();
  } catch (err) {
    console.error('Database initialization warning:', err);
  }

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({ ok: true }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, message: "Method not allowed" }),
    };
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    // Get auth info from headers
    const userId = (event.headers["x-user-id"] as string) || (context.clientContext?.user?.sub as string);
    const patientId = (event.headers["x-patient-id"] as string) || (context.clientContext?.user?.sub as string);

    if (!userId || !patientId) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, message: "Unauthorized - missing user or patient ID" }),
      };
    }

    const body: RequestBody = JSON.parse(event.body || "{}");
    const { nctId, trialTitle } = body;

    if (!nctId || !nctId.match(/^NCT\d{8}$/)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, message: "Invalid NCT ID format" }),
      };
    }

    // Check if patient already expressed interest
    try {
      const existing = await query(
        "SELECT id FROM trial_interests WHERE patient_id = $1 AND nct_id = $2",
        [patientId, nctId.toUpperCase()]
      );

      if (existing && existing.rows && existing.rows.length > 0) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            ok: true,
            message: "Interest already expressed",
            alreadyInterested: true,
          }),
        };
      }
    } catch (dbErr: any) {
      console.warn("Error checking existing interest (may be schema not ready):", dbErr.message);
      // Continue - schema might not be initialized yet
    }

    // Insert interest record
    try {
      const result = await query(
        `INSERT INTO trial_interests (patient_id, user_id, nct_id, trial_title, expressed_at, created_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, patient_id, nct_id, trial_title, expressed_at`,
        [patientId, userId, nctId.toUpperCase(), trialTitle || null]
      );

      // Log audit event
      try {
        await logAuditEvent(
          userId,
          "PATIENT_EXPRESS_INTEREST",
          "trial_interest",
          result.rows[0].id,
          patientId,
          { nctId, trialTitle }
        );
      } catch (auditErr) {
        console.warn("Failed to log audit event:", auditErr);
        // Don't fail the request just because audit logging failed
      }

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: true,
          message: "Interest expressed successfully",
          data: result.rows[0],
        }),
      };
    } catch (dbErr: any) {
      console.error("Database error expressing interest:", dbErr);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          message: "Database error: " + (dbErr.message || "Failed to express interest"),
        }),
      };
    }
  } catch (error: any) {
    console.error("Error expressing interest:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ok: false,
        message: error.message || "Failed to express interest",
      }),
    };
  }
};

export { handler };
