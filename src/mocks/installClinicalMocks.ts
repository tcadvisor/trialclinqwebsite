export function installClinicalMocks() {
  try {
    const w = window as any;
    if (w.__clinicalMocksInstalled) return;
    // Enable only when explicitly turned on to avoid interfering with real network calls.
    // Set window.__enableClinicalMocks = true in the console to enable mocks during local testing.
    const enabled = w.__enableClinicalMocks === true;
    if (!enabled) return;

    const summarizePath = "/api/summarize";
    const writePath = "/api/profile-write";

    const originalFetch = window.fetch.bind(window);

    async function delay(ms: number) {
      return new Promise((res) => setTimeout(res, ms));
    }

    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // Ensure any synchronous exception is caught and converted into a resolved Response.
      return (async () => {
        try {
          let urlStr: string;
          try {
            urlStr = typeof input === "string" ? input : (input as any).url || String(input);
          } catch (e) {
            urlStr = String(input);
          }

          let path = '';
          try {
            const u = new URL(urlStr, window.location.origin);
            path = u.pathname;
          } catch (e) {
            // leave path empty - we'll forward to real fetch
            path = '';
          }

          if (path === summarizePath && (init?.method || "GET").toUpperCase() === "POST") {
            await delay(500);
            const requestId = `REQ-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
            const body = {
              summaryMarkdown:
                "62-year-old female with stage II invasive ductal breast carcinoma; comorbidity: hypertension. Completed radiotherapy May 2024; currently on letrozole and lisinopril; no evidence of active infection. Labs: ANC 2.1 x10^9/L, creatinine 0.9 mg/dL, hemoglobin 12.7 g/dL. ECOG 1.",
              summaryPlain:
                "62-year-old female with stage II invasive ductal breast carcinoma and hypertension. Completed radiotherapy in May 2024; tolerating letrozole; blood pressure controlled on lisinopril. No active infection. Labs within acceptable range (ANC 2.1, Cr 0.9, Hgb 12.7). ECOG 1.",
              eligibility: {
                overall: "Likely eligible",
                criteria: [
                  { id: "inc-age>=18", meets: true, evidence: "Age 62" },
                  { id: "exc-active-infection", meets: true, evidence: "None documented" },
                ],
                missing: ["Hep B surface antigen"],
              },
              audit: { requestId, generatedAt: new Date().toISOString() },
            };
            return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
          }

          if (path === writePath && ["PUT", "PATCH"].includes((init?.method || "GET").toUpperCase())) {
            await delay(300);
            return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
          }

          try {
            return await originalFetch(input as any, init);
          } catch (err) {
            try { console.error("Original fetch failed in clinical mocks:", err); } catch (_) {}
            return new Response(JSON.stringify({ error: "Network error" }), { status: 502, headers: { "Content-Type": "application/json" } });
          }
        } catch (e) {
          try { console.error('Clinical mocks wrapper unexpected error', e); } catch (_) {}
          return new Response(JSON.stringify({ error: 'Mock wrapper error' }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      })();
    };

    w.__clinicalMocksInstalled = true;
  } catch (_) {
    // ignore
  }
}
