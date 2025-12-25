import type { Handler } from "@netlify/functions";
import Busboy from "busboy";
import pdf from "pdf-parse";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TEXT_CHARS = 120000;

type ParsedUpload = {
  fields: Record<string, string>;
  file?: { filename: string; mimeType: string; data: Buffer };
};

function cors(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      "content-type": "application/json",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

function parseMultipart(event: any): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"];
    if (!contentType) {
      reject(new Error("Missing content-type"));
      return;
    }
    const bb = Busboy({ headers: { "content-type": contentType } });
    const fields: Record<string, string> = {};
    let fileData: Buffer[] = [];
    let fileMeta: { filename: string; mimeType: string } | null = null;

    bb.on("file", (_name, file, info) => {
      fileMeta = { filename: info.filename || "upload", mimeType: info.mimeType || "application/octet-stream" };
      file.on("data", (d) => fileData.push(d));
    });

    bb.on("field", (name, val) => {
      fields[name] = val;
    });

    bb.on("finish", () => {
      const data = fileData.length ? Buffer.concat(fileData) : undefined;
      resolve({
        fields,
        file: fileMeta && data ? { filename: fileMeta.filename, mimeType: fileMeta.mimeType, data } : undefined,
      });
    });

    bb.on("error", reject);

    const body = event.body
      ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8")
      : Buffer.alloc(0);
    bb.end(body);
  });
}

async function extractText(file: { mimeType: string; data: Buffer }) {
  const mime = file.mimeType || "";
  if (mime === "application/pdf") {
    const parsed = await pdf(file.data);
    return parsed.text || "";
  }
  if (mime === "application/json") {
    try {
      const json = JSON.parse(file.data.toString("utf8"));
      return JSON.stringify(json, null, 2);
    } catch {
      return file.data.toString("utf8");
    }
  }
  return file.data.toString("utf8");
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return cors(204, "");
  }

  if (event.httpMethod !== "POST") {
    return cors(405, { error: "Method not allowed" });
  }

  const key = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "";
  if (!key) {
    return cors(500, { error: "OPENAI_API_KEY not set" });
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  if (!authHeader) {
    return cors(401, { error: "Missing Authorization header" });
  }

  try {
    const parsed = await parseMultipart(event);
    const file = parsed.file;
    if (!file) return cors(400, { error: "Missing file" });

    const profileId = parsed.fields.profileId || "unknown";
    const uploadId = parsed.fields.uploadId || "unknown";
    const text = await extractText(file);
    const trimmed = text.slice(0, MAX_TEXT_CHARS);
    if (!trimmed.trim()) return cors(400, { error: "Empty document" });

    // Log file details for debugging
    console.log(`[summarize] Processing file: ${file.filename} (${file.mimeType}, ${Buffer.byteLength(file.data)} bytes) for profile ${profileId}, upload ${uploadId}`);
    console.log(`[summarize] Extracted text length: ${trimmed.length} chars`);
    console.log(`[summarize] First 500 chars of extracted text: ${trimmed.substring(0, 500)}`);

    const model = process.env.OPENAI_SUMMARIZE_MODEL || DEFAULT_MODEL;
    const prompt = [
      "You are a medical document analyzer. Your task is to extract and summarize clinical information from the provided document.",
      "If the document is NOT a medical/clinical document, respond with: {\"summaryMarkdown\": \"Not a medical document\", \"summaryPlain\": \"Unable to summarize non-medical content\", \"eligibility\": {\"overall\": \"Unknown\", \"criteria\": [], \"missing\": []}}",
      "For MEDICAL documents only:",
      "1. Provide a concise markdown summary (200-400 words max) highlighting key clinical findings",
      "2. Provide a plain-text summary (100-200 words max)",
      "3. If you can infer trial eligibility based on the document, provide: overall (Eligible/Likely eligible/Ineligible/Unknown), criteria met/not met, and missing information",
      "Output ONLY valid JSON with exactly these keys: summaryMarkdown, summaryPlain, eligibility (with overall, criteria array, missing array).",
      "Do NOT make up or hallucinate medical information. Only summarize what is explicitly stated in the document.",
    ].join(" ");

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: trimmed },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const textErr = await res.text().catch(() => "");
      const errorMsg = textErr || `HTTP ${res.status}`;
      // Log detailed error for debugging
      console.error(`[summarize] OpenAI API error (${res.status}):`, errorMsg);
      return cors(res.status, { error: errorMsg, detail: "OpenAI API request failed. Check API key validity." });
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[summarize] OpenAI returned no content");
      return cors(500, { error: "OpenAI returned empty response" });
    }

    let out: any = {};
    try {
      out = JSON.parse(content);
      console.log(`[summarize] Successfully parsed OpenAI response`);
    } catch (parseErr) {
      console.error(`[summarize] Failed to parse OpenAI JSON response:`, content.substring(0, 500));
      return cors(500, { error: "Invalid JSON response from OpenAI", detail: "Could not parse AI response" });
    }

    // Validate required fields
    if (!out.summaryMarkdown && !out.summary) {
      console.warn(`[summarize] Response missing summaryMarkdown field:`, out);
    }

    return cors(200, {
      summaryMarkdown: out.summaryMarkdown || out.summary || "",
      summaryPlain: out.summaryPlain || "",
      eligibility: out.eligibility || { overall: "Unknown", criteria: [], missing: [] },
      audit: { requestId: data?.id || "unknown", generatedAt: new Date().toISOString(), profileId, uploadId, fileName: file.filename },
    });
  } catch (e: any) {
    return cors(500, { error: String(e?.message || e || "Unknown error") });
  }
};
