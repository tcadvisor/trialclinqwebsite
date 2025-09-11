import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import { AuthProvider } from "./lib/auth";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
