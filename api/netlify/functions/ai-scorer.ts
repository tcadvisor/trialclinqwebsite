import type { Handler } from "@netlify/functions";
import { createCorsHandler } from "./cors-utils";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export const handler: Handler = async (event) => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("POST,OPTIONS");
  }

  if (event.httpMethod !== "POST") {
    return cors.response(405, { error: "Method not allowed" });
  }

  const key = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "";
  if (!key) {
    return cors.response(500, { error: "OPENAI_API_KEY not set" });
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const prompt: string = payload.prompt || "";
    if (!prompt) return cors.response(400, { error: "Missing prompt" });

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
          { role: "system", content: "You score clinical trial eligibility and fit. The score MUST be calculated as the SUM of these components: Condition match (0-40), Demographics (0-15), Exclusions (0-20), Medications (0-10), Location (0-10), Status (0-5). Review ALL patient conditions, medications, and allergies listed. Output ONLY JSON with integer score (0-100 = sum of components) and rationale (<=160 chars showing calculation)." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return cors.response(res.status, { error: text || `HTTP ${res.status}` });
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    let out: any = {};
    try {
      out = content ? JSON.parse(content) : {};
    } catch {
      // GPT returned something we can't parse -- surface this instead of silently returning 0
      console.error("ai-scorer: failed to parse GPT response:", content?.slice(0, 200));
      return cors.response(502, { error: "Unparseable response from scoring model", raw: content?.slice(0, 300) });
    }
    if (typeof out.score === "undefined") {
      return cors.response(502, { error: "Model response missing score field", raw: content?.slice(0, 300) });
    }
    const scoreNum = clamp(Math.round(Number(out.score)), 0, 100);
    const rationale = String(out.rationale || "");

    return cors.response(200, { score: scoreNum, rationale });
  } catch (e: any) {
    return cors.response(500, { error: String(e?.message || e || "Unknown error") });
  }
};
