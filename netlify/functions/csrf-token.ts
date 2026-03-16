import type { Handler } from "@netlify/functions";
import { generateCsrfToken, corsWithCsrf } from "./csrf-utils";

/**
 * Generate a new CSRF token
 * This endpoint is called when the app loads to get a fresh CSRF token
 */
export const handler: Handler = async (event) => {
  // Handle OPTIONS preflight request
  if (event.httpMethod === "OPTIONS") {
    return corsWithCsrf(204, "");
  }

  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return corsWithCsrf(405, { error: "Method not allowed" });
  }

  try {
    // Generate a new CSRF token
    const csrfToken = generateCsrfToken();

    console.log("✅ CSRF token generated successfully");

    // Return the token in both the response body and header
    return corsWithCsrf(
      200,
      {
        ok: true,
        csrfToken,
        expiresIn: 3600, // 1 hour in seconds
      },
      {
        "X-CSRF-Token": csrfToken,
      }
    );
  } catch (error: any) {
    console.error("❌ Error generating CSRF token:", error);
    return corsWithCsrf(500, {
      error: "Failed to generate CSRF token",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
