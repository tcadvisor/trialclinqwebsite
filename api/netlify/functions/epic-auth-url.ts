import { Handler } from "@netlify/functions";
import { randomBytes, createHash } from "crypto";
import { createCorsHandler } from "./cors-utils";

const handler: Handler = async (event) => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("GET,POST,OPTIONS");
  }

  try {
    const clientId = process.env.VITE_EPIC_CLIENT_ID;
    const redirectUri = process.env.VITE_EPIC_REDIRECT_URI;
    const fhirUrl = process.env.VITE_EPIC_FHIR_URL;

    console.log("Epic Auth URL - Config check:", {
      hasClientId: !!clientId,
      hasRedirectUri: !!redirectUri,
      hasFhirUrl: !!fhirUrl,
    });

    if (!clientId || !redirectUri || !fhirUrl) {
      return cors.response(500, {
        error: "Missing EPIC configuration",
        message: "VITE_EPIC_CLIENT_ID, VITE_EPIC_REDIRECT_URI, or VITE_EPIC_FHIR_URL not set",
      });
    }

    console.log("Fetching EPIC SMART configuration...");
    // Grab EPIC's SMART config so we know where to send the user
    const wellKnownUrl = `${fhirUrl}.well-known/smart-configuration`;
    const configResponse = await fetch(wellKnownUrl);

    if (!configResponse.ok) {
      const errorText = await configResponse.text();
      console.error("EPIC config fetch failed:", errorText);
      return cors.response(500, {
        error: "Failed to fetch EPIC configuration",
        message: `EPIC SMART config returned ${configResponse.status}`,
      });
    }

    const smartConfig = await configResponse.json();
    const authorizationEndpoint = smartConfig.authorization_endpoint;

    if (!authorizationEndpoint) {
      return cors.response(500, {
        error: "EPIC configuration missing authorization_endpoint",
      });
    }

    console.log("Authorization endpoint:", authorizationEndpoint);

    // Generate PKCE code verifier and challenge
    const randomBuffer = randomBytes(32);
    const codeVerifier = randomBuffer
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const hash = createHash("sha256");
    hash.update(codeVerifier);
    const codeChallenge = hash
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    // Generate state for CSRF protection
    const stateBuffer = randomBytes(16);
    const state = stateBuffer.toString("hex");

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

    console.log("Auth URL generated successfully");

    return cors.response(200, {
      authUrl: authUrl,
      codeVerifier: codeVerifier,
      state: state,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Epic auth URL generation failed:", message);

    return cors.response(500, {
      error: "auth_url_generation_failed",
      message: message,
    });
  }
};

export { handler };
