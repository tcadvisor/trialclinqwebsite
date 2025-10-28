import React from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export type EhrItem = {
  id: string;
  vendor: string;
  organization: string;
  portals: number;
  isEpic?: boolean;
};

const ALL_EHRS: EhrItem[] = [
  { id: "1", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "2", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "3", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2, isEpic: true },
  { id: "4", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
  { id: "5", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "6", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "7", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2, isEpic: true },
  { id: "8", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
  { id: "9", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "10", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "11", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2, isEpic: true },
  { id: "12", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
  { id: "13", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "14", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "15", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2, isEpic: true },
  { id: "16", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
  { id: "17", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "18", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "19", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2, isEpic: true },
  { id: "20", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
  { id: "21", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "22", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "23", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2, isEpic: true },
  { id: "24", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
];

const EPIC_TEST_PATIENTS = [
  {
    name: "Camila Lopez",
    fhirId: "e3u7nUSdz9pwVvtEMp3",
    conditions: ["Diabetes", "Hypertension"],
    medications: ["Metformin", "Lisinopril"],
  },
  {
    name: "Derrick Lih",
    fhirId: "ey8t1fDgQJm6tJhGmQoD",
    conditions: ["COPD", "Asthma"],
    medications: ["Albuterol", "Fluticasone"],
  },
  {
    name: "Desiree Powell",
    fhirId: "aKBm0I8k8uvJdcnsrXMm3",
    conditions: ["Immunization", "Observation"],
    medications: ["Vitamins"],
  },
];

function Card({ item, onConnect }: { item: EhrItem; onConnect: (item: EhrItem) => void }) {
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 grid place-items-center rounded bg-gray-100 text-gray-700 text-xs font-semibold">
          {item.vendor.split(" ")[0]}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-500">{item.vendor}</div>
          <div className="font-medium leading-5">{item.organization}</div>
          <button className="mt-2 inline-flex items-center text-xs rounded-full bg-blue-50 text-blue-700 px-2 py-1">
            {item.portals} portal{item.portals > 1 ? "s" : ""}
          </button>
        </div>
        <button
          onClick={() => onConnect(item)}
          aria-label="Connect"
          className="ml-auto h-7 w-7 grid place-items-center rounded border text-gray-700 hover:bg-gray-50 transition"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function EhrDirectory(): JSX.Element {
  const [q, setQ] = React.useState("");
  const [visible, setVisible] = React.useState(12);
  const [connecting, setConnecting] = React.useState(false);
  const [showSandbox, setShowSandbox] = React.useState(false);
  const [popupMessage, setPopupMessage] = React.useState("");
  const navigate = useNavigate();

  // Check if user has authenticated after popup closes
  React.useEffect(() => {
    if (!connecting) return;

    const checkAuthTimer = setInterval(() => {
      const tokens = localStorage.getItem("epic:tokens:v1");
      if (tokens) {
        setConnecting(false);
        setPopupMessage("");
        clearInterval(checkAuthTimer);
        navigate("/patients/health-profile", {
          state: { epicConnected: true },
        });
      }
    }, 500);

    return () => clearInterval(checkAuthTimer);
  }, [connecting, navigate]);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ALL_EHRS;
    return ALL_EHRS.filter((i) => i.vendor.toLowerCase().includes(t) || i.organization.toLowerCase().includes(t));
  }, [q]);

  const items = filtered.slice(0, visible);
  const canLoadMore = visible < filtered.length;

  const handleConnect = async (item: EhrItem) => {
    if (item.isEpic) {
      try {
        setConnecting(true);
        setPopupMessage("Initializing EPIC connection...");

        const step1 = "Step 1: Loading configuration";
        console.log(`[EPIC] ${step1}`);

        const clientId = (import.meta as any).env?.VITE_EPIC_CLIENT_ID;
        const redirectUri = (import.meta as any).env?.VITE_EPIC_REDIRECT_URI;
        const fhirUrl = (import.meta as any).env?.VITE_EPIC_FHIR_URL;

        console.log(`[EPIC] Configuration loaded:`, {
          clientId: clientId ? `${clientId.substring(0, 8)}...` : "MISSING",
          redirectUri: redirectUri ? `${redirectUri.substring(0, 40)}...` : "MISSING",
          fhirUrl: fhirUrl ? `${fhirUrl.substring(0, 30)}...` : "MISSING",
        });

        if (!clientId || !redirectUri || !fhirUrl) {
          throw new Error(
            `Configuration incomplete: clientId=${!!clientId}, redirectUri=${!!redirectUri}, fhirUrl=${!!fhirUrl}`
          );
        }

        const step2 = "Step 2: Fetching EPIC SMART configuration";
        console.log(`[EPIC] ${step2}`);
        setPopupMessage(step2);

        const wellKnownUrl = `${fhirUrl}.well-known/smart-configuration`;
        console.log(`[EPIC] Fetching from: ${wellKnownUrl}`);

        const configResponse = await fetch(wellKnownUrl);

        if (!configResponse.ok) {
          throw new Error(
            `EPIC SMART config fetch failed with status ${configResponse.status}. URL: ${wellKnownUrl}`
          );
        }

        const smartConfig = await configResponse.json();
        const authorizationEndpoint = smartConfig.authorization_endpoint;

        if (!authorizationEndpoint) {
          throw new Error("EPIC SMART configuration missing authorization_endpoint. Response: " + JSON.stringify(smartConfig));
        }

        console.log(`[EPIC] Authorization endpoint: ${authorizationEndpoint}`);

        const step3 = "Step 3: Generating PKCE challenge";
        console.log(`[EPIC] ${step3}`);
        setPopupMessage(step3);

        // Generate PKCE code verifier and challenge
        const randomBytes = crypto.getRandomValues(new Uint8Array(32));
        const codeVerifier = btoa(String.fromCharCode.apply(null, Array.from(randomBytes)))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");

        // Calculate SHA256 hash of verifier
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const codeChallenge = btoa(String.fromCharCode.apply(null, hashArray))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");

        console.log(`[EPIC] PKCE challenge generated (verifier length: ${codeVerifier.length}, challenge length: ${codeChallenge.length})`);

        // Generate state for CSRF protection
        const state = crypto.getRandomValues(new Uint8Array(16));
        const stateString = Array.from(state)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        console.log(`[EPIC] State generated: ${stateString}`);

        // Store PKCE and state for callback
        sessionStorage.setItem("epic_code_verifier", codeVerifier);
        sessionStorage.setItem("epic_state", stateString);
        console.log(`[EPIC] Stored code_verifier and state in sessionStorage`);

        const step4 = "Step 4: Building authorization URL";
        console.log(`[EPIC] ${step4}`);
        setPopupMessage(step4);

        // Build authorization URL
        const params = new URLSearchParams({
          response_type: "code",
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: "openid fhirUser",
          state: stateString,
          aud: fhirUrl.replace(/\/$/, ""),
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        });

        const authUrl = `${authorizationEndpoint}?${params.toString()}`;
        console.log(`[EPIC] Authorization URL: ${authUrl.substring(0, 100)}...`);

        const step5 = "Step 5: Redirecting to EPIC authorization";
        console.log(`[EPIC] ${step5}`);
        setPopupMessage("Redirecting to EPIC for authorization...");

        console.log(`[EPIC] Full auth URL: ${authUrl}`);
        console.log(`[EPIC] Performing window.location.href redirect...`);

        // Direct redirect to EPIC auth (works even in sandboxed iframe)
        window.location.href = authUrl;
      } catch (error) {
        console.error("[EPIC] Connection failed:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        const fullError = `EPIC Connection Error:\n\n${errorMsg}\n\nCheck the browser console (F12 → Console) for detailed logs.`;
        alert(fullError);
        setConnecting(false);
        setPopupMessage("");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      {popupMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600"></div>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">Connecting to EPIC</h2>
                <p className="text-sm text-gray-600 mt-2">{popupMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-xl font-semibold">Available EMR/EHRs</h1>
        <p className="text-sm text-gray-600 mt-1">
          Securely connect your health record to help TrialCliniq match you with the most relevant clinical trials
        </p>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Testing with EPIC Sandbox?</h3>
              <p className="text-sm text-blue-700 mt-1">
                Use our test patients to preview the EPIC integration with real patient data.
              </p>
            </div>
            <button
              onClick={() => setShowSandbox(!showSandbox)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap"
            >
              {showSandbox ? "Hide" : "Show"} Test Patients
            </button>
          </div>
        </div>

        {showSandbox && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">EPIC Sandbox Test Patients</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {EPIC_TEST_PATIENTS.map((patient) => (
                <div key={patient.fhirId} className="rounded-xl border-2 border-blue-300 p-4 bg-blue-50">
                  <div className="font-medium text-gray-900">{patient.name}</div>
                  <div className="text-xs text-gray-600 mt-1">ID: {patient.fhirId}</div>
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700">Conditions:</div>
                    <div className="text-xs text-gray-600">{patient.conditions.join(", ")}</div>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-gray-700">Medications:</div>
                    <div className="text-xs text-gray-600">{patient.medications.join(", ")}</div>
                  </div>
                  <button
                    onClick={() => {
                      alert("Clicked: " + patient.name);
                      handleConnect({ id: "epic-sandbox", vendor: "Epic", organization: "EPIC Sandbox", portals: 1, isEpic: true });
                    }}
                    disabled={connecting}
                    className="mt-4 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {connecting ? "Connecting..." : "Connect as " + patient.name.split(" ")[0]}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="relative max-w-xl">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search healthcare systems or providers"
              className="w-full rounded-full border px-4 py-2 pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((i) => (
            <Card key={i.id + "-" + visible} item={i} onConnect={handleConnect} />
          ))}
        </div>

        <div className="mt-6">
          {canLoadMore ? (
            <div className="max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => setVisible((v) => Math.min(v + 9, filtered.length))}
                className="w-full rounded-full border px-4 py-2 hover:bg-gray-50"
              >
                Load more
              </button>
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500">No more results</div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-end text-xs text-gray-500">
          <span>Powered by Health Gorilla</span>
        </div>
      </main>
    </div>
  );
}
