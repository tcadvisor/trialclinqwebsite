// init Sentry before anything else touches the DOM
import "./lib/sentry";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import { getAccessToken } from "./lib/entraId";
import { registerClinicalSummaryUploader } from "./builder/registerClinicalSummaryUploader";

try {
  const w: any = window as any;
  // Expose a global token provider for upload endpoints and summary webhook auth
  w.getAuthToken = async () => {
    try {
      return (await getAccessToken()) || "";
    } catch (err) {
      console.warn("getAuthToken failed", err);
      return "";
    }
  };
  if (w && w.Builder) {
    registerClinicalSummaryUploader(w.Builder);
  }
} catch {}

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
