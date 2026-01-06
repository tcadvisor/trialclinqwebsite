import type { Handler } from "@netlify/functions";
import Busboy from "busboy";
import pdf from "pdf-parse";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o"; // Use gpt-4o for better structured output and JSON handling
const MAX_TEXT_CHARS = 120000;
const SUPPORTED_MIME = new Set(["application/pdf"]);
const SUPPORTED_EXT = new Set([".pdf"]);

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

function getExtension(filename: string) {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

function detectKind(mimeType: string, filename: string) {
  const mime = mimeType || "";
  if (SUPPORTED_MIME.has(mime)) {
    return "pdf";
  }
  const ext = getExtension(filename);
  if (SUPPORTED_EXT.has(ext)) {
    return "pdf";
  }
  return null;
}

function looksBinary(buf: Buffer) {
  const len = Math.min(buf.length, 8000);
  if (len === 0) return false;
  let suspicious = 0;
  for (let i = 0; i < len; i++) {
    const b = buf[i];
    if (b === 0) return true;
    const isWhitespace = b === 9 || b === 10 || b === 13;
    const isPrintable = b >= 32 && b <= 126;
    if (!isPrintable && !isWhitespace) suspicious++;
  }
  return suspicious / len > 0.2;
}

function isLowQualityText(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 80) return true;
  const nonWhitespace = trimmed.replace(/\s+/g, "");
  if (!nonWhitespace) return true;
  const letters = nonWhitespace.match(/[A-Za-z]/g)?.length || 0;
  const ratio = letters / nonWhitespace.length;
  return ratio < 0.2;
}

function looksLikeResume(text: string) {
  const lower = text.toLowerCase();
  const resumeHits = [
    "experience",
    "education",
    "skills",
    "work history",
    "employment",
    "certifications",
    "professional summary",
    "objective",
    "references",
    "projects",
  ];
  let hits = 0;
  for (const term of resumeHits) {
    if (lower.includes(term)) hits++;
  }
  return hits >= 2;
}

function looksMedical(text: string) {
  const lower = text.toLowerCase();
  const medicalHits = [
    "diagnosis",
    "treatment",
    "medication",
    "radiology",
    "pathology",
    "ecog",
    "lab",
    "cbc",
    "mg/dl",
    "hx",
    "hpi",
    "assessment",
    "plan",
    "patient",
  ];
  let hits = 0;
  for (const term of medicalHits) {
    if (lower.includes(term)) hits++;
  }
  return hits >= 2;
}

async function extractText(file: { mimeType: string; data: Buffer; filename: string }, kind: "pdf") {
  try {
    if (kind === "pdf") {
      try {
        const parsed = await pdf(file.data);
        const text = parsed.text || "";
        if (!text.trim()) {
          console.warn("[extractText] PDF extracted but contains no text");
        }
        return text;
      } catch (err) {
        console.error("[extractText] Failed to parse PDF:", err);
        throw new Error(`PDF parsing failed: ${err}`);
      }
    }
    return "";
  } catch (err) {
    console.error("[extractText] Unexpected error:", err);
    throw err;
  }
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
    const kind = detectKind(file.mimeType, file.filename);
    if (!kind) {
      return cors(415, { error: "Unsupported file type. Please upload a PDF file." });
    }
    if (looksBinary(file.data)) {
      return cors(415, { error: "Unsupported file type. The uploaded file appears to be binary." });
    }

    const text = await extractText({ ...file, filename: file.filename }, kind);
    const trimmed = text.slice(0, MAX_TEXT_CHARS);
    if (isLowQualityText(trimmed)) {
      return cors(422, { error: "Unable to extract readable text from this PDF. Please upload a text-based PDF." });
    }
    if (looksLikeResume(trimmed) && !looksMedical(trimmed)) {
      return cors(422, { error: "This document appears to be non-medical (e.g., a resume). Please upload a clinical document." });
    }
    if (!trimmed.trim()) return cors(400, { error: "Empty document" });

    // Log file details for debugging
    console.log(`[summarize] Processing file: ${file.filename} (${file.mimeType}, ${Buffer.byteLength(file.data)} bytes) for profile ${profileId}, upload ${uploadId}`);
    console.log(`[summarize] Extracted text length: ${trimmed.length} chars`);
    console.log(`[summarize] First 500 chars of extracted text: ${trimmed.substring(0, 500)}`);

    const model = process.env.OPENAI_SUMMARIZE_MODEL || DEFAULT_MODEL;
    const prompt = [
      "You are a medical document analyzer. Your task is to extract and summarize clinical information from the provided document.",
      "If the document is NOT a medical/clinical document or is unreadable/garbled, respond with: {\"summaryMarkdown\": \"Unable to extract readable text from document\", \"summaryPlain\": \"Unable to summarize this document\", \"eligibility\": {\"overall\": \"Unknown\", \"criteria\": [], \"missing\": []}}",
      "For MEDICAL documents only:",
      "1. Provide a concise markdown summary (200-400 words max) highlighting key clinical findings",
      "2. Provide a plain-text summary (100-200 words max)",
      "3. If you can infer trial eligibility based on the document, provide: overall (Eligible/Likely eligible/Ineligible/Unknown), criteria met/not met, and missing information",
      "Output ONLY valid JSON with exactly these keys: summaryMarkdown, summaryPlain, eligibility (with overall, criteria array, missing array).",
      "Do NOT make up or hallucinate medical information. Only summarize what is explicitly stated in the document.",
      "Use ONLY the text between DOCUMENT START and DOCUMENT END.",
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
          { role: "user", content: `DOCUMENT START\n${trimmed}\nDOCUMENT END` },
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
