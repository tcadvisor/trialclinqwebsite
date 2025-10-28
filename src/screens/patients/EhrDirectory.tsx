import React from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { getEpicAuthorizationEndpoint } from "../../lib/epic";

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
  const navigate = useNavigate();

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
        const clientId = (import.meta as any).env?.VITE_EPIC_CLIENT_ID;
        const redirectUri = (import.meta as any).env?.VITE_EPIC_REDIRECT_URI;
        const fhirUrl = (import.meta as any).env?.VITE_EPIC_FHIR_URL;

        if (!clientId || !redirectUri || !fhirUrl) {
          throw new Error(
            "Missing EPIC configuration. Please ensure VITE_EPIC_CLIENT_ID, VITE_EPIC_REDIRECT_URI, and VITE_EPIC_FHIR_URL are set."
          );
        }

        console.log("Fetching EPIC authorization endpoint...");
        const authEndpoint = await getEpicAuthorizationEndpoint();
        console.log("Authorization endpoint:", authEndpoint);

        // Generate PKCE code verifier and challenge (per EPIC spec)
        console.log("Generating PKCE...");
        const array = new Uint8Array(32);
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        const codeVerifier = btoa(String.fromCharCode.apply(null, Array.from(array)))
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

        console.log("PKCE generated successfully");

        // Store for callback
        sessionStorage.setItem("epic_code_verifier", codeVerifier);
        sessionStorage.setItem("epic_state", Math.random().toString(36).substring(7));

        const state = sessionStorage.getItem("epic_state") || "";
        const aud = fhirUrl.replace(/\/$/, "");

        const params = new URLSearchParams({
          response_type: "code",
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: "openid fhirUser",
          state: state,
          aud: aud,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        });

        const fullUrl = `${authEndpoint}?${params.toString()}`;
        console.log("OAuth Request Parameters:", {
          response_type: "code",
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: "openid fhirUser",
          aud: aud,
          code_challenge_method: "S256",
        });
        console.log("Redirecting to:", fullUrl);

        window.location.href = fullUrl;
      } catch (error) {
        console.error("Failed to initiate EPIC connection:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        alert(`Failed to connect to EPIC: ${errorMsg}`);
        setConnecting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
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
