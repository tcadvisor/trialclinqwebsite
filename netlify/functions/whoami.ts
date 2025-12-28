import type { Handler } from "@netlify/functions";
import { getOrCreateUser } from "./db";
import { getUserFromAuthHeader } from "./auth-utils";

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

    return cors(200, {
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
    return cors(401, { error: error.message || "Unauthorized" });
  }
};
