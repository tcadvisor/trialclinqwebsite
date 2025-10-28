import { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  let code: string | null = null;
  let code_verifier: string | null = null;

  // Parse code and code_verifier from either query params or JSON body
  if (event.httpMethod === "POST" && event.body) {
    try {
      const body = JSON.parse(event.body);
      code = body.code;
      code_verifier = body.code_verifier;
    } catch (e) {
      console.error("Failed to parse POST body:", e);
    }
  }

  // Fallback to query parameters if not in body
  if (!code && event.queryStringParameters) {
    code = event.queryStringParameters.code;
    code_verifier = event.queryStringParameters.code_verifier;
  }

  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing authorization code" }),
    };
  }

  const clientId = process.env.VITE_EPIC_CLIENT_ID;
  const fhirUrl = process.env.VITE_EPIC_FHIR_URL;
  const redirectUri = process.env.VITE_EPIC_REDIRECT_URI;

  if (!clientId || !fhirUrl || !redirectUri) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing EPIC configuration" }),
    };
  }

  try {
    // Get the OAuth 2.0 token endpoint from EPIC's well-known configuration
    const wellKnownUrl = `${fhirUrl}.well-known/smart-configuration`;
    const configResponse = await fetch(wellKnownUrl);

    if (!configResponse.ok) {
      throw new Error(`Failed to fetch EPIC well-known config: ${configResponse.status}`);
    }

    const config = await configResponse.json();
    const tokenEndpoint = config.token_endpoint;

    if (!tokenEndpoint) {
      throw new Error("No token_endpoint in EPIC SMART configuration");
    }

    // Exchange authorization code for access token (server-side)
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: code_verifier || "",
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokens = await tokenResponse.json();

    // Fetch patient data using the access token
    let patientData = null;
    if (tokens.patient) {
      try {
        const patientRes = await fetch(`${fhirUrl}Patient/${tokens.patient}`, {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });

        if (patientRes.ok) {
          const patient = await patientRes.json();

          // Fetch allergies, medications, conditions in parallel
          const [allergiesRes, medicationsRes, conditionsRes] = await Promise.all([
            fetch(`${fhirUrl}AllergyIntolerance?patient=${tokens.patient}`, {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            }),
            fetch(`${fhirUrl}MedicationRequest?patient=${tokens.patient}`, {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            }),
            fetch(`${fhirUrl}Condition?patient=${tokens.patient}`, {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            }),
          ]);

          patientData = {
            id: patient.id,
            name: patient.name?.[0]?.text,
            birthDate: patient.birthDate,
            gender: patient.gender,
            allergies: allergiesRes.ok ? await allergiesRes.json() : { entry: [] },
            medications: medicationsRes.ok ? await medicationsRes.json() : { entry: [] },
            conditions: conditionsRes.ok ? await conditionsRes.json() : { entry: [] },
          };
        }
      } catch (err) {
        console.error("Error fetching patient data:", err);
        // Continue without patient data rather than failing
      }
    }

    // Return tokens and patient data to client
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: tokens.access_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
        refresh_token: tokens.refresh_token,
        patient: tokens.patient,
        patientData: patientData,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Token exchange error:", message);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "token_exchange_failed",
        message: message,
      }),
    };
  }
};

export { handler };
