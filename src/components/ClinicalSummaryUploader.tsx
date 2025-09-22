import React, { useCallback, useMemo, useRef, useState } from "react";

export type ClinicalSummaryUploaderProps = {
  title?: string;
  acceptedTypes?: string[];
  maxFileSizeMB?: number;
  summarizeApiUrl: string;
  writeProfileApiUrl: string;
  showEligibilityBadges?: boolean;
  authHeaderName?: string;
  getAuthTokenClientFnName?: string;
};

type Stage =
  | "idle"
  | "valid"
  | "uploading"
  | "parsing"
  | "summarizing"
  | "saving"
  | "success"
  | "error";

type SummarizeResponse = {
  summaryMarkdown?: string;
  summaryPlain?: string;
  eligibility?: {
    overall?: "Eligible" | "Likely eligible" | "Ineligible" | "Unknown";
    criteria?: { id: string; meets: boolean; evidence?: string }[];
    missing?: string[];
  };
  audit?: { requestId?: string; generatedAt?: string };
};

function bytesToMB(b: number) {
  return b / (1024 * 1024);
}

function formatFileInfo(file: File) {
  const mb = bytesToMB(file.size).toFixed(2);
  return `${file.name} • ${mb} MB • ${file.type || "unknown"}`;
}

function nowIso() {
  return new Date().toISOString();
}

async function withTimeout<T>(promise: Promise<T>, ms: number, controller: AbortController): Promise<T> {
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await promise;
  } finally {
    clearTimeout(t);
  }
}

function track(event: string, data: Record<string, any>) {
  try {
    const w: any = window as any;
    if (typeof w.track === "function") {
      w.track(event, data);
    }
  } catch {}
}

export function buildMarkdownAppend(
  res: Required<Pick<SummarizeResponse, "summaryMarkdown">> & Pick<SummarizeResponse, "eligibility" | "audit">,
  includeEligibility: boolean,
): string {
  const generatedAt = res.audit?.generatedAt || nowIso();
  const requestId = res.audit?.requestId || "unknown";
  const lines: string[] = [];
  lines.push("### Clinical Record Summary (auto-generated)");
  lines.push(`**Generated:** ${new Date(generatedAt).toISOString().slice(0, 10)} • **Request ID:** ${requestId}`);
  lines.push("");
  lines.push("#### Patient Snapshot");
  lines.push("");
  lines.push("#### Diagnoses / Comorbidities");
  lines.push("- ");
  lines.push("");
  lines.push("#### Treatments / Procedures");
  lines.push("- ");
  lines.push("");
  lines.push("#### Allergies");
  lines.push("- ");
  lines.push("");
  lines.push("#### Key Labs");
  lines.push("- ");
  lines.push("");
  lines.push("#### Notes");
  lines.push(res.summaryMarkdown.trim());
  lines.push("");

  if (includeEligibility && res.eligibility) {
    const el = res.eligibility;
    lines.push("#### Trial Eligibility (if enabled)");
    if (el.overall) lines.push(`**Overall:** ${el.overall}`);
    if (el.criteria && el.criteria.length > 0) {
      lines.push("- Criteria:");
      for (const c of el.criteria) {
        const mark = c.meets ? "✅" : "❌";
        const evidence = c.evidence ? ` — ${c.evidence}` : "";
        lines.push(`  - ${c.id}: ${mark}${evidence}`);
      }
    }
    if (el.missing && el.missing.length > 0) {
      lines.push("- Missing data:");
      for (const m of el.missing) {
        lines.push(`  - ${m}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export default function ClinicalSummaryUploader(props: ClinicalSummaryUploaderProps): JSX.Element {
  const {
    title = "Summarize Health Record",
    acceptedTypes = ["application/pdf", "text/plain", "application/json"],
    maxFileSizeMB = 25,
    profileId,
    summarizeApiUrl,
    writeProfileApiUrl,
    showEligibilityBadges = true,
    authHeaderName = "Authorization",
    getAuthTokenClientFnName = "getAuthToken",
  } = props;

  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const acceptAttr = useMemo(() => acceptedTypes.join(","), [acceptedTypes]);

  const reset = useCallback(() => {
    setStage("idle");
    setProgress(0);
    setMessage("");
    setFile(null);
  }, []);

  const setError = useCallback((msg: string) => {
    setStage("error");
    setMessage(msg);
    setProgress(0);
  }, []);

  const validate = useCallback((f: File | null): string | null => {
    if (!f) return "No file selected";
    if (acceptedTypes.length > 0 && f.type && !acceptedTypes.includes(f.type)) {
      return "Unsupported file type";
    }
    if (bytesToMB(f.size) > maxFileSizeMB) {
      return "File too large";
    }
    return null;
  }, [acceptedTypes, maxFileSizeMB]);

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    const err = validate(f || null);
    if (err) {
      setError(err);
      return;
    }
    setFile(f as File);
    setStage("valid");
    setMessage("");
  }, [validate, setError]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    const err = validate(f || null);
    if (err) {
      setError(err);
      return;
    }
    setFile(f as File);
    setStage("valid");
    setMessage("");
  }, [validate, setError]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  async function summarizeAndSave() {
    if (!file) return;
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }

    try {
      const w: any = window as any;
      const getTok = w?.[getAuthTokenClientFnName];
      if (typeof getTok !== "function") {
        setError("Authentication not available");
        return;
      }
      const token = await Promise.resolve(getTok());
      if (!token) {
        setError("Authentication failed");
        return;
      }

      track("clinical_summary_upload_started", { profileId });

      // Step 1: Upload + summarize
      setStage("uploading");
      setProgress(0.15);

      const form = new FormData();
      form.append("file", file);
      form.append("profileId", profileId);
      form.append("options.showEligibilityBadges", String(!!showEligibilityBadges));

      setStage("parsing");
      setProgress(0.35);

      const ctrl1 = new AbortController();
      const res = await withTimeout(
        fetch(summarizeApiUrl, {
          method: "POST",
          headers: {
            [authHeaderName]: `Bearer ${token}`,
          } as any,
          body: form,
          signal: ctrl1.signal,
        }),
        120_000,
        ctrl1,
      );

      setStage("summarizing");
      setProgress(0.6);

      if (!res.ok) {
        setError("Summarization failed");
        track("clinical_summary_error", { profileId, stage: "summarize", code: res.status });
        return;
      }

      const data = (await res.json()) as SummarizeResponse;
      if (!data || !data.summaryMarkdown) {
        setError("Summarization failed");
        track("clinical_summary_error", { profileId, stage: "summarize", code: "no_summary" });
        return;
      }

      const appendMarkdown = buildMarkdownAppend({ summaryMarkdown: data.summaryMarkdown, eligibility: data.eligibility, audit: data.audit }, !!showEligibilityBadges);

      // Step 2: Save to profile
      setStage("saving");
      setProgress(0.85);

      const ctrl2 = new AbortController();
      const saveRes = await withTimeout(
        fetch(writeProfileApiUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            [authHeaderName]: `Bearer ${token}`,
          } as any,
          body: JSON.stringify({
            profileId,
            additionalInformationAppendMarkdown: appendMarkdown,
          }),
          signal: ctrl2.signal,
        }),
        120_000,
        ctrl2,
      );

      if (!saveRes.ok) {
        setError("Save failed");
        track("clinical_summary_error", { profileId, stage: "save", code: saveRes.status });
        return;
      }

      setStage("success");
      setProgress(1);
      setMessage("Summary saved to Additional Information");

      try {
        const raw = localStorage.getItem("tc_health_profile_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          const prev = parsed.additionalInfo || "";
          parsed.additionalInfo = (prev ? prev + "\n\n" : "") + appendMarkdown;
          localStorage.setItem("tc_health_profile_v1", JSON.stringify(parsed));
          window.dispatchEvent(new Event("storage"));
        }
      } catch {}

      track("clinical_summary_success", { profileId, requestId: data.audit?.requestId });
    } catch (e: any) {
      const aborted = e?.name === "AbortError";
      setError(aborted ? "Network timeout" : "Upload failed");
      track("clinical_summary_error", { profileId, stage: "network", code: e?.name || "error" });
    }
  }

  const pct = Math.round(progress * 100);

  return (
    <div className="rounded-xl border bg-white">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <div className="text-xs text-gray-500">Max {maxFileSizeMB} MB</div>
      </div>
      <div className="p-4">
        <div
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="border-2 border-dashed rounded-lg p-6 text-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          tabIndex={0}
          aria-label="Upload health record"
        >
          <div className="text-sm text-gray-700">Drag and drop a PDF/TXT/JSON here</div>
          <div className="mt-2 text-xs text-gray-500">or</div>
          <div className="mt-2">
            <button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50">Choose file</button>
          </div>
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept={acceptAttr}
            onChange={onPick}
          />
          {file && (
            <div className="mt-3 text-xs text-gray-600" aria-live="polite">{formatFileInfo(file)}</div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={summarizeAndSave}
            disabled={stage !== "valid"}
            className={`rounded-full px-4 py-2 text-sm ${stage === "valid" ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
          >
            Summarize
          </button>
          {stage !== "idle" && (
            <button onClick={reset} className="rounded-full border px-4 py-2 text-sm hover:bg-gray-50">Reset</button>
          )}
        </div>

        {(stage === "uploading" || stage === "parsing" || stage === "summarizing" || stage === "saving") && (
          <div className="mt-4" aria-live="polite">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-gray-900" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {stage === "uploading" && "Uploading..."}
              {stage === "parsing" && "Parsing..."}
              {stage === "summarizing" && "Summarizing..."}
              {stage === "saving" && "Saving to Profile..."}
            </div>
          </div>
        )}

        {stage === "success" && (
          <div className="mt-4 text-sm text-emerald-700" role="status" aria-live="polite">{message}</div>
        )}
        {stage === "error" && (
          <div className="mt-4 text-sm text-red-700" role="alert" aria-live="polite">{message}</div>
        )}
      </div>
    </div>
  );
}
