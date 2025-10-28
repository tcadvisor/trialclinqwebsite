import { Handler } from "@netlify/functions";
import crypto from "crypto";

const handler: Handler = async (event) => {
  try {
    const clientId = process.env.VITE_EPIC_CLIENT_ID;
    const redirectUri = process.env.VITE_EPIC_REDIRECT_URI;
    const fhirUrl = process.env.VITE_EPIC_FHIR_URL;

    if (!clientId || !redirectUri || !fhirUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing EPIC configuration",
          message: "VITE_EPIC_CLIENT_ID, VITE_EPIC_REDIRECT_URI, or VITE_EPIC_FHIR_URL not set",
        }),
      };
    }

    // Fetch EPIC's SMART configuration to get authorization endpoint
    const wellKnownUrl = `${fhirUrl}.well-known/smart-configuration`;
    const configResponse = await fetch(wellKnownUrl);

    if (!configResponse.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to fetch EPIC configuration",
          message: `EPIC SMART config returned ${configResponse.status}`,
        }),
      };
    }

    const smartConfig = await configResponse.json();
    const authorizationEndpoint = smartConfig.authorization_endpoint;

    if (!authorizationEndpoint) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "EPIC configuration missing authorization_endpoint",
        }),
      };
    }

    // Generate PKCE code verifier and challenge
    const randomBytes = crypto.randomBytes(32);
    const codeVerifier = randomBytes
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "openid fhirUser",
      state: state,
      aud: fhirUrl.replace(/\/$/, ""),
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `${authorizationEndpoint}?${params.toString()}`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authUrl: authUrl,
        codeVerifier: codeVerifier,
        state: state,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Epic auth URL generation failed:", message);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "auth_url_generation_failed",
        message: message,
      }),
    };
  }
};

export { handler };
