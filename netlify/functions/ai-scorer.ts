import type { Handler } from "@netlify/functions";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST,OPTIONS",
        "access-control-allow-headers": "content-type,authorization",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const key = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "";
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "OPENAI_API_KEY not set" }) };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const prompt: string = payload.prompt || "";
    if (!prompt) return { statusCode: 400, body: JSON.stringify({ error: "Missing prompt" }) };

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
      return { statusCode: res.status, body: JSON.stringify({ error: text || `HTTP ${res.status}` }) };
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    let out: any = {};
    try { out = content ? JSON.parse(content) : {}; } catch { out = {}; }
    const scoreNum = clamp(Math.round(Number(out.score)), 0, 100);
    const rationale = String(out.rationale || "");

    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({ score: scoreNum, rationale }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e?.message || e || "Unknown error") }) };
  }
};
