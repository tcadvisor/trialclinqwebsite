import type { ClinicalSummaryUploaderProps } from "../components/ClinicalSummaryUploader";
import ClinicalSummaryUploader from "../components/ClinicalSummaryUploader";

export function registerClinicalSummaryUploader(Builder: any) {
  if (!Builder || typeof Builder.registerComponent !== "function") return;
  Builder.registerComponent(ClinicalSummaryUploader, {
    name: "Clinical Summary Uploader",
    inputs: [
      { name: "title", type: "string", defaultValue: "Summarize Health Record", helperText: "Heading displayed in the card" },
      {
        name: "acceptedTypes",
        type: "list",
        subFields: [{ name: "type", type: "string" }],
        defaultValue: ["application/pdf", "text/plain", "application/json"],
        helperText: "Allowed MIME types",
      },
      { name: "maxFileSizeMB", type: "number", defaultValue: 25, helperText: "Maximum file size in MB" },
      { name: "profileId", type: "string", required: true },
      { name: "summarizeApiUrl", type: "string", required: true },
      { name: "writeProfileApiUrl", type: "string", required: true },
      { name: "showEligibilityBadges", type: "boolean", defaultValue: true },
      { name: "authHeaderName", type: "string", defaultValue: "Authorization" },
      { name: "getAuthTokenClientFnName", type: "string", defaultValue: "getAuthToken", helperText: "Name of global function returning a bearer token" },
    ],
  });
}

export type { ClinicalSummaryUploaderProps };
