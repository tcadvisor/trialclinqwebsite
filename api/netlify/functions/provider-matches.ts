import type { Handler } from "@netlify/functions";
import { query } from "./db";
import { createCorsHandler } from "./cors-utils";

export const handler: Handler = async (event) => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("GET,POST,DELETE,OPTIONS");
  }

  const userId = event.headers["x-user-id"];
  if (!userId) {
    return cors.response(401, { ok: false, error: "Missing x-user-id header" });
  }

  try {
    // GET -- list matched volunteers for this provider
    if (event.httpMethod === "GET") {
      const result = await query(
        `SELECT volunteer_id as "id", code, title
         FROM provider_matched_volunteers
         WHERE provider_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      return cors.response(200, {
        ok: true,
        volunteers: result.rows,
      });
    }

    // POST -- add a matched volunteer
    if (event.httpMethod === "POST") {
      const body = event.body ? JSON.parse(event.body) : {};
      const { id, code, title } = body;

      if (!id) {
        return cors.response(400, { ok: false, error: "Volunteer id is required" });
      }

      await query(
        `INSERT INTO provider_matched_volunteers (provider_id, volunteer_id, code, title)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (provider_id, volunteer_id) DO UPDATE SET code = $3, title = $4`,
        [userId, id, code || "", title || ""]
      );

      return cors.response(201, { ok: true });
    }

    // DELETE -- remove a matched volunteer
    if (event.httpMethod === "DELETE") {
      const volunteerId = event.queryStringParameters?.volunteerId;
      if (!volunteerId) {
        return cors.response(400, { ok: false, error: "volunteerId query param is required" });
      }

      await query(
        `DELETE FROM provider_matched_volunteers WHERE provider_id = $1 AND volunteer_id = $2`,
        [userId, volunteerId]
      );

      return cors.response(200, { ok: true });
    }

    return cors.response(405, { ok: false, error: "Method not allowed" });
  } catch (err: any) {
    console.error("provider-matches error:", err);
    return cors.response(500, { ok: false, error: "Internal server error" });
  }
};
