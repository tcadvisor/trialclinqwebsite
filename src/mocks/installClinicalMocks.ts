export function installClinicalMocks() {
  try {
    const w = window as any;
    if (w.__clinicalMocksInstalled) return;
    // Enable by default; allow disabling by setting window.__enableClinicalMocks = false
    const enabled = w.__enableClinicalMocks !== false;
    if (!enabled) return;

    const summarizePath = "/api/summarize";
    const writePath = "/api/profile/write";

    const originalFetch = window.fetch.bind(window);

    async function delay(ms: number) {
      return new Promise((res) => setTimeout(res, ms));
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      try {
        const url = typeof input === "string" ? input : (input as any).url || String(input);
        const u = new URL(url, window.location.origin);
        const path = u.pathname;

        if (path === summarizePath && (init?.method || "GET").toUpperCase() === "POST") {
          await delay(500);
          const requestId = `REQ-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
          const body = {
            summaryMarkdown:
              "- Patient presents with chronic neuropathic pain.\n- Prior treatments include gabapentinoids with partial response.\n- No active infection or uncontrolled comorbidities documented.",
            summaryPlain:
              "Patient with chronic neuropathic pain; partial response to prior therapy; no active infection noted.",
            eligibility: {
              overall: "Likely eligible",
              criteria: [
                { id: "inc-age>=18", meets: true, evidence: "Age >= 18" },
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
      } catch (_) {
        // fall through to real fetch
      }
      return originalFetch(input as any, init);
    };

    w.__clinicalMocksInstalled = true;
  } catch (_) {
    // ignore
  }
}
