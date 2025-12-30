import { Handler } from "@netlify/functions";
import { query, initializeDatabase } from "./db";

export type InterestedPatient = {
  id: number;
  patientId: string;
  nctId: string;
  expressedAt: string;
};

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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({ ok: true }),
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, message: "Method not allowed" }),
    };
  }

  try {
    // Get auth info from context
    const userId = context.clientContext?.user?.sub || (event.headers["x-user-id"] as string);

    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, message: "Unauthorized - missing user ID" }),
      };
    }

    const nctId = event.queryStringParameters?.nctId as string;

    if (!nctId || !nctId.match(/^NCT\d{8}$/)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, message: "Invalid NCT ID format" }),
      };
    }

    // Fetch interested patients for this trial
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
      [nctId.toUpperCase()]
    );

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ok: true,
        nctId: nctId.toUpperCase(),
        count: result.rows.length,
        interestedPatients: result.rows,
      }),
    };
  } catch (error: any) {
    console.error("Error fetching trial interests:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ok: false,
        message: error.message || "Failed to fetch trial interests",
      }),
    };
  }
};

export { handler };
