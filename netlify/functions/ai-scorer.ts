import type { Handler } from "@netlify/functions";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function cors(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      "content-type": "application/json",
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return cors(204, "");
  }

  if (event.httpMethod !== "POST") {
    return cors(405, { error: "Method not allowed" });
  }

  const key = process.env.OPENAI_API_KEY || "";
  if (!key) {
    return cors(500, { error: "OPENAI_API_KEY not set" });
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const prompt: string = payload.prompt || "";
    if (!prompt) return cors(400, { error: "Missing prompt" });

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        messages: [
          { role: "system", content: "You score clinical trial eligibility and fit. Output ONLY JSON with integer score (0-100) and rationale (<=160 chars)." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return cors(res.status, { error: text || `HTTP ${res.status}` });
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    let out: any = {};
    try { out = content ? JSON.parse(content) : {}; } catch { out = {}; }
    const scoreNum = clamp(Math.round(Number(out.score)), 0, 100);
    const rationale = String(out.rationale || "");

    return cors(200, { score: scoreNum, rationale });
  } catch (e: any) {
    return cors(500, { error: String(e?.message || e || "Unknown error") });
  }
};
