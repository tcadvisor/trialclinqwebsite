import type { Handler } from "@netlify/functions";

function cors(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,PUT,OPTIONS",
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

  if (event.httpMethod !== "PUT" && event.httpMethod !== "POST") {
    return cors(405, { error: "Method not allowed" });
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  if (!authHeader) {
    return cors(401, { error: "Missing Authorization header" });
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    if (!payload?.profileId || !payload?.additionalInformationAppendMarkdown) {
      return cors(400, { error: "Missing profileId or additionalInformationAppendMarkdown" });
    }
    return cors(200, { ok: true });
  } catch (e: any) {
    return cors(500, { error: String(e?.message || e || "Unknown error") });
  }
};
