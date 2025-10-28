/**
 * EPIC FHIR Integration
 * Handles OAuth 2.0 authorization and FHIR data fetching from EPIC
 */

export interface EpicOAuthConfig {
  clientId: string;
  redirectUri: string;
  fhirUrl: string;
}

export interface EpicTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  patient: string;
}

export interface PatientData {
  id: string;
  name?: string;
  birthDate?: string;
  gender?: string;
  allergies: Allergy[];
  medications: Medication[];
  conditions: Condition[];
}

export interface Allergy {
  id: string;
  substance: string;
  reaction?: string;
  severity?: string;
}

export interface Medication {
  id: string;
  name: string;
  status?: string;
  dosage?: string;
}

export interface Condition {
  id: string;
  code: string;
  display: string;
  status?: string;
}

const STORAGE_KEY = "epic:tokens:v1";

export function getEpicConfig(): EpicOAuthConfig {
  const clientId = (import.meta as any).env?.VITE_EPIC_CLIENT_ID as string;
  const redirectUri = (import.meta as any).env?.VITE_EPIC_REDIRECT_URI as string;
  const fhirUrl = (import.meta as any).env?.VITE_EPIC_FHIR_URL as string;

  if (!clientId || !redirectUri || !fhirUrl) {
    throw new Error("Missing EPIC configuration. Set VITE_EPIC_CLIENT_ID, VITE_EPIC_REDIRECT_URI, and VITE_EPIC_FHIR_URL");
  }

  return { clientId, redirectUri, fhirUrl };
}

// Generate PKCE code challenge
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => String.fromCharCode(b))
    .join("");
  const base64url = btoa(codeVerifier)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return { codeVerifier, codeChallenge: base64url };
}

export function getEpicAuthUrl(state?: string): string {
  const config = getEpicConfig();
  const { codeChallenge } = generatePKCE();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: "openid fhirUser patient/*.read",
    state: state || Math.random().toString(36).substring(7),
    aud: config.fhirUrl,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${config.fhirUrl}..well-known/smart-configuration`;
}

export async function getEpicAuthorizationEndpoint(): Promise<string> {
  const config = getEpicConfig();
  try {
    const fhirUrlBase = config.fhirUrl.replace(/\/api\/FHIR\/R4\/?$/, "");
    const wellKnownUrl = `${fhirUrlBase}/.well-known/smart-configuration`;
    const response = await fetch(wellKnownUrl);
    if (!response.ok) throw new Error(`Failed to fetch SMART config: ${response.status}`);
    const data = await response.json();
    return data.authorization_endpoint;
  } catch (error) {
    console.error("Failed to get EPIC authorization endpoint:", error);
    throw error;
  }
}

export async function exchangeCodeForToken(code: string, state?: string): Promise<EpicTokenResponse> {
  const config = getEpicConfig();
  try {
    const fhirUrlBase = config.fhirUrl.replace(/\/api\/FHIR\/R4\/?$/, "");
    const wellKnownUrl = `${fhirUrlBase}/.well-known/smart-configuration`;
    const configResponse = await fetch(wellKnownUrl);
    if (!configResponse.ok) throw new Error(`Failed to fetch SMART config: ${configResponse.status}`);
    const smartConfig = await configResponse.json();

    const tokenEndpoint = smartConfig.token_endpoint;
    if (!tokenEndpoint) throw new Error("No token_endpoint in SMART configuration");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = (await response.json()) as EpicTokenResponse;
    saveEpicTokens(tokens);
    return tokens;
  } catch (error) {
    console.error("Failed to exchange code for token:", error);
    throw error;
  }
}

export function saveEpicTokens(tokens: EpicTokenResponse): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch (e) {
    console.error("Failed to save EPIC tokens:", e);
  }
}

export function getEpicTokens(): EpicTokenResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EpicTokenResponse;
  } catch (e) {
    console.error("Failed to parse EPIC tokens:", e);
    return null;
  }
}

export function clearEpicTokens(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear EPIC tokens:", e);
  }
}

export async function fetchPatientData(patientId: string, accessToken: string): Promise<PatientData> {
  const config = getEpicConfig();

  try {
    const [patientRes, allergiesRes, medicationsRes, conditionsRes] = await Promise.all([
      fetch(`${config.fhirUrl}Patient/${patientId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${config.fhirUrl}AllergyIntolerance?patient=${patientId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${config.fhirUrl}MedicationRequest?patient=${patientId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${config.fhirUrl}Condition?patient=${patientId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    if (!patientRes.ok) throw new Error(`Failed to fetch patient: ${patientRes.status}`);

    const patient = await patientRes.json();
    const allergies = allergiesRes.ok ? await allergiesRes.json() : { entry: [] };
    const medications = medicationsRes.ok ? await medicationsRes.json() : { entry: [] };
    const conditions = conditionsRes.ok ? await conditionsRes.json() : { entry: [] };

    return {
      id: patient.id,
      name: patient.name?.[0]?.text,
      birthDate: patient.birthDate,
      gender: patient.gender,
      allergies: (allergies.entry || []).map((entry: any) => ({
        id: entry.resource.id,
        substance: entry.resource.code?.text || entry.resource.code?.coding?.[0]?.display,
        reaction: entry.resource.reaction?.[0]?.manifestation?.[0]?.text,
        severity: entry.resource.reaction?.[0]?.severity,
      })),
      medications: (medications.entry || []).map((entry: any) => ({
        id: entry.resource.id,
        name: entry.resource.medicationCodeableConcept?.text || entry.resource.medicationCodeableConcept?.coding?.[0]?.display,
        status: entry.resource.status,
        dosage: entry.resource.dosageInstruction?.[0]?.text,
      })),
      conditions: (conditions.entry || []).map((entry: any) => ({
        id: entry.resource.id,
        code: entry.resource.code?.coding?.[0]?.code,
        display: entry.resource.code?.text || entry.resource.code?.coding?.[0]?.display,
        status: entry.resource.clinicalStatus?.coding?.[0]?.code,
      })),
    };
  } catch (error) {
    console.error("Failed to fetch patient data:", error);
    throw error;
  }
}
