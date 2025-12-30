import { Handler } from "@netlify/functions";
import { query, initializeDatabase } from "./db";

export type InterestedPatient = {
  id: number;
  patientId: string;
  nctId: string;
  expressedAt: string;
};

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
  console.log("=== Get Trial Interests Request ===");
  console.log("Method:", event.httpMethod);

  try {
    // OPTIONS request
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
        },
        body: JSON.stringify({ ok: true }),
      };
    }

    // Only allow GET
    if (event.httpMethod !== "GET") {
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
    console.log("Auth check - userId:", !!userId);

    if (!userId) {
      return errorResponse(401, "Missing x-user-id header");
    }

    // Get NCT ID from query params
    const nctId = event.queryStringParameters?.nctId as string;
    console.log("Query params - nctId:", nctId);

    if (!nctId || !nctId.match(/^NCT\d{8}$/)) {
      return errorResponse(400, `Invalid NCT ID format: ${nctId}`);
    }

    const nctIdUpper = nctId.toUpperCase();

    // Fetch interested patients
    console.log("Fetching interested patients for trial:", nctIdUpper);

    try {
      const result = await query(
        `SELECT 
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
         ORDER BY ti.expressed_at DESC`,
        [nctIdUpper]
      );

      console.log("Found interested patients:", result?.rows?.length || 0);

      return successResponse(200, {
        ok: true,
        nctId: nctIdUpper,
        count: result?.rows?.length || 0,
        interestedPatients: result?.rows || [],
      });
    } catch (dbErr: any) {
      console.error("Database error fetching trial interests:", dbErr);
      return errorResponse(500, `Database error: ${dbErr.message || "Query failed"}`);
    }
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return errorResponse(500, err.message || "Internal server error");
  }
};

export { handler };
