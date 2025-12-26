import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import { defineConfig } from "vite";
import path from "path";
import Busboy from "busboy";
import pdf from "pdf-parse";

// Token exchange middleware for development
function epicTokenExchangePlugin() {
  return {
    name: 'epic-token-exchange',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions/epic-token-exchange', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const { code, code_verifier } = data;

            if (!code) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing authorization code' }));
              return;
            }

            const clientId = process.env.VITE_EPIC_CLIENT_ID;
            const fhirUrl = process.env.VITE_EPIC_FHIR_URL;
            const redirectUri = process.env.VITE_EPIC_REDIRECT_URI;

            console.log('[DEV TOKEN EXCHANGE] Config:', {
              clientId: clientId ? `${clientId.substring(0, 8)}...` : 'MISSING',
              fhirUrl: fhirUrl ? `${fhirUrl.substring(0, 30)}...` : 'MISSING',
              redirectUri: redirectUri ? `${redirectUri.substring(0, 40)}...` : 'MISSING',
            });

            if (!clientId || !fhirUrl || !redirectUri) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing EPIC configuration' }));
              return;
            }

            console.log('[DEV TOKEN EXCHANGE] Fetching EPIC well-known configuration');
            const wellKnownUrl = `${fhirUrl}.well-known/smart-configuration`;
            const configResponse = await fetch(wellKnownUrl);

            if (!configResponse.ok) {
              throw new Error(`Failed to fetch EPIC well-known config: ${configResponse.status}`);
            }

            const config = await configResponse.json();
            const tokenEndpoint = config.token_endpoint;

            if (!tokenEndpoint) {
              throw new Error('No token_endpoint in EPIC SMART configuration');
            }

            console.log('[DEV TOKEN EXCHANGE] Token endpoint:', tokenEndpoint);

            const tokenBody = new URLSearchParams({
              grant_type: 'authorization_code',
              code: code,
              client_id: clientId,
              redirect_uri: redirectUri,
              code_verifier: code_verifier || '',
            });

            console.log('[DEV TOKEN EXCHANGE] Exchanging code for tokens');
            const tokenResponse = await fetch(tokenEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: tokenBody.toString(),
            });

            if (!tokenResponse.ok) {
              const errorText = await tokenResponse.text();
              console.error('[DEV TOKEN EXCHANGE] Token exchange failed:', errorText);
              throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
            }

            const tokens = await tokenResponse.json();
            console.log('[DEV TOKEN EXCHANGE] Tokens received successfully');

            let patientData = null;
            if (tokens.patient) {
              try {
                console.log('[DEV TOKEN EXCHANGE] Fetching patient data');
                const patientRes = await fetch(`${fhirUrl}Patient/${tokens.patient}`, {
                  headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                  },
                });

                if (patientRes.ok) {
                  const patient = await patientRes.json();

                  const [allergiesRes, medicationsRes, conditionsRes] = await Promise.all([
                    fetch(`${fhirUrl}AllergyIntolerance?patient=${tokens.patient}`, {
                      headers: { Authorization: `Bearer ${tokens.access_token}` },
                    }),
                    fetch(`${fhirUrl}MedicationRequest?patient=${tokens.patient}`, {
                      headers: { Authorization: `Bearer ${tokens.access_token}` },
                    }),
                    fetch(`${fhirUrl}Condition?patient=${tokens.patient}`, {
                      headers: { Authorization: `Bearer ${tokens.access_token}` },
                    }),
                  ]);

                  patientData = {
                    id: patient.id,
                    name: patient.name?.[0]?.text,
                    birthDate: patient.birthDate,
                    gender: patient.gender,
                    allergies: allergiesRes.ok ? await allergiesRes.json() : { entry: [] },
                    medications: medicationsRes.ok ? await medicationsRes.json() : { entry: [] },
                    conditions: conditionsRes.ok ? await conditionsRes.json() : { entry: [] },
                  };
                  console.log('[DEV TOKEN EXCHANGE] Patient data fetched successfully');
                }
              } catch (err) {
                console.error('[DEV TOKEN EXCHANGE] Error fetching patient data:', err);
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              access_token: tokens.access_token,
              token_type: tokens.token_type,
              expires_in: tokens.expires_in,
              refresh_token: tokens.refresh_token,
              patient: tokens.patient,
              patientData: patientData,
            }));
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[DEV TOKEN EXCHANGE] Error:', message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'token_exchange_failed',
              message: message,
            }));
          }
        });
      });
    }
  };
}

function summarizeDevPlugin() {
  const MAX_TEXT_CHARS = 120000;
  const SUPPORTED_MIME = new Set(["application/pdf"]);
  const SUPPORTED_EXT = new Set([".pdf"]);

  function getExtension(filename: string) {
    const idx = filename.lastIndexOf(".");
    return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
  }

  function detectKind(mimeType: string, filename: string) {
    const mime = mimeType || "";
    if (SUPPORTED_MIME.has(mime)) return "pdf";
    const ext = getExtension(filename);
    if (SUPPORTED_EXT.has(ext)) return "pdf";
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

  function json(res: any, status: number, body: any) {
    res.statusCode = status;
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-methods", "POST,OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type,authorization");
    res.setHeader("content-type", "application/json");
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  }

  function parseMultipart(req: any): Promise<{ fields: Record<string, string>; file?: { filename: string; mimeType: string; data: Buffer } }> {
    return new Promise((resolve, reject) => {
      const contentType = req.headers?.["content-type"];
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
      req.pipe(bb);
    });
  }

  async function extractText(file: { mimeType: string; data: Buffer; filename: string }, kind: "pdf") {
    if (kind === "pdf") {
      const parsed = await pdf(file.data);
      return parsed.text || "";
    }
    return "";
  }

  async function handleSummarize(req: any, res: any) {
    if (req.method === "OPTIONS") {
      json(res, 204, "");
      return;
    }
    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }
    const key = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "";
    if (!key) {
      json(res, 500, { error: "OPENAI_API_KEY not set" });
      return;
    }
    const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
    if (!authHeader) {
      json(res, 401, { error: "Missing Authorization header" });
      return;
    }

    try {
      const parsed = await parseMultipart(req);
      const file = parsed.file;
      if (!file) {
        json(res, 400, { error: "Missing file" });
        return;
      }
      const profileId = parsed.fields.profileId || "unknown";
      const uploadId = parsed.fields.uploadId || "unknown";
      const kind = detectKind(file.mimeType, file.filename);
      if (!kind) {
        json(res, 415, { error: "Unsupported file type. Please upload a PDF file." });
        return;
      }
      if (looksBinary(file.data)) {
        json(res, 415, { error: "Unsupported file type. The uploaded file appears to be binary." });
        return;
      }

      const text = await extractText({ ...file, filename: file.filename }, kind);
      const trimmed = text.slice(0, MAX_TEXT_CHARS);
      if (isLowQualityText(trimmed)) {
        json(res, 422, { error: "Unable to extract readable text from this PDF. Please upload a text-based PDF." });
        return;
      }
      if (looksLikeResume(trimmed) && !looksMedical(trimmed)) {
        json(res, 422, { error: "This document appears to be non-medical (e.g., a resume). Please upload a clinical document." });
        return;
      }
      if (!trimmed.trim()) {
        json(res, 400, { error: "Empty document" });
        return;
      }

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

      const model = process.env.OPENAI_SUMMARIZE_MODEL || "gpt-4o";
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
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

      if (!aiRes.ok) {
        const textErr = await aiRes.text().catch(() => "");
        json(res, aiRes.status, { error: textErr || `HTTP ${aiRes.status}` });
        return;
      }

      const data = await aiRes.json();
      const content: string | undefined = data?.choices?.[0]?.message?.content;
      if (!content) {
        json(res, 500, { error: "OpenAI returned empty response" });
        return;
      }

      let out: any = {};
      try {
        out = JSON.parse(content);
      } catch {
        json(res, 500, { error: "Invalid JSON response from OpenAI" });
        return;
      }

      json(res, 200, {
        summaryMarkdown: out.summaryMarkdown || out.summary || "",
        summaryPlain: out.summaryPlain || "",
        eligibility: out.eligibility || { overall: "Unknown", criteria: [], missing: [] },
        audit: { requestId: data?.id || "unknown", generatedAt: new Date().toISOString(), profileId, uploadId, fileName: file.filename },
      });
    } catch (e: any) {
      json(res, 500, { error: String(e?.message || e || "Unknown error") });
    }
  }

  function handleProfileWrite(req: any, res: any) {
    if (!["PUT", "PATCH"].includes((req.method || "").toUpperCase())) {
      json(res, 405, { error: "Method not allowed" });
      return;
    }
    json(res, 200, { ok: true });
  }

  function handleBookDemo(req: any, res: any) {
    if (req.method === "OPTIONS") {
      json(res, 204, "");
      return;
    }
    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }

    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          json(res, 500, { error: "RESEND_API_KEY not configured" });
          return;
        }

        const formData = body ? JSON.parse(body) : {};

        // Generate email content based on form type
        let subject = "New Form Submission";
        let html = `<pre>${JSON.stringify(formData, null, 2)}</pre>`;

        if (formData.type === "sponsor_demo") {
          subject = "New Demo Request - TrialClinIQ";
          html = `
            <h2>New Demo Request</h2>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Organization:</strong> ${formData.organization}</p>
            <p>Please reach out to schedule a demo call.</p>
          `;
        } else if (formData.type === "patient_waitlist") {
          subject = "New Patient Waitlist Signup - TrialClinIQ";
          html = `
            <h2>New Patient Waitlist Signup</h2>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>CNS Research Area:</strong> ${formData.condition}</p>
            <p>A new patient has signed up for the waitlist.</p>
          `;
        } else if (formData.type === "newsletter_signup") {
          subject = "New Newsletter Subscriber - TrialClinIQ";
          html = `
            <h2>New Newsletter Subscriber</h2>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p>A new subscriber has joined the newsletter.</p>
          `;
        }

        // Send email via Resend
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: "chandler@trialcliniq.com",
            subject,
            html,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          console.error("[book-demo] Resend error:", errorText);
          json(res, 502, { error: "Failed to send email", status: response.status });
          return;
        }

        const result = await response.json();
        console.log("[book-demo] Email sent successfully:", result.id);
        json(res, 200, { ok: true, messageId: result.id });
      } catch (err: any) {
        console.error("[book-demo] Error:", err);
        json(res, 500, { error: err?.message || String(err) });
      }
    });

    req.on("error", (err: any) => {
      json(res, 500, { error: err?.message || "Request error" });
    });
  }

  return {
    name: "summarize-dev",
    configureServer(server) {
      const summarizePaths = ["/.netlify/functions/summarize", "/api/summarize"];
      const writePaths = ["/.netlify/functions/profile-write", "/api/profile-write"];
      const bookDemoPaths = ["/.netlify/functions/book-demo", "/api/book-demo"];
      summarizePaths.forEach((p) => server.middlewares.use(p, handleSummarize));
      writePaths.forEach((p) => server.middlewares.use(p, handleProfileWrite));
      bookDemoPaths.forEach((p) => server.middlewares.use(p, handleBookDemo));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), epicTokenExchangePlugin(), summarizeDevPlugin()],
  publicDir: "./static",
  base: "./",
  css: {
    postcss: {
      plugins: [tailwind()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
