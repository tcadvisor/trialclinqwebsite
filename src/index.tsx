import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import { AuthProvider } from "./lib/auth";
import { registerClinicalSummaryUploader } from "./builder/registerClinicalSummaryUploader";
import { installClinicalMocks } from "./mocks/installClinicalMocks";

try {
  const w: any = window as any;
  if (import.meta.env.DEV && w && w.__enableClinicalMocks == null) {
    w.__enableClinicalMocks = true;
  }
  installClinicalMocks();
  if (w && w.Builder) {
    registerClinicalSummaryUploader(w.Builder);
  }
} catch {}

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
