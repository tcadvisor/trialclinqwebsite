import type { Handler } from "@netlify/functions";
import { getOrCreateUser } from "./db";
import { getUserFromAuthHeader } from "./auth-utils";
import { createCorsHandler } from "./cors-utils";

export const handler: Handler = async (event) => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("GET,OPTIONS");
  }

  if (event.httpMethod !== "GET") {
    return cors.response(405, { error: "Method not allowed" });
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  if (!authHeader) {
    return cors.response(401, { error: "Missing Authorization header" });
  }

  try {
    // Validate Azure token and ensure user exists in DB
    const authenticatedUser = await getUserFromAuthHeader(authHeader);

    const user = await getOrCreateUser(
      authenticatedUser.userId,
      authenticatedUser.email,
      authenticatedUser.oid,
      authenticatedUser.firstName,
      authenticatedUser.lastName,
      authenticatedUser.role
    );

    return cors.response(200, {
      ok: true,
      user: {
        id: user.id,
        userId: user.user_id || authenticatedUser.userId,
        azureOid: user.azure_oid || authenticatedUser.oid,
        email: user.email || authenticatedUser.email,
        firstName: user.first_name || authenticatedUser.firstName,
        lastName: user.last_name || authenticatedUser.lastName,
        role: user.role || authenticatedUser.role,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    return cors.response(401, { error: error.message || "Unauthorized" });
  }
};
