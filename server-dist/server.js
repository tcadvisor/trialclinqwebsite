"use strict";
const express = require("express");
const path = require("path");
const app = express();
app.use(express.json());
// EPIC token exchange endpoint
app.post("/api/epic/token-exchange", async (req, res) => {
    try {
        const { code, code_verifier } = req.body;
        if (!code) {
            return res.status(400).json({ error: "Missing authorization code" });
        }
        const clientId = process.env.VITE_EPIC_CLIENT_ID;
        const fhirUrl = process.env.VITE_EPIC_FHIR_URL;
        const redirectUri = process.env.VITE_EPIC_REDIRECT_URI;
        if (!clientId || !fhirUrl || !redirectUri) {
            console.error("Missing EPIC configuration:", { clientId: !!clientId, fhirUrl: !!fhirUrl, redirectUri: !!redirectUri });
            return res.status(500).json({ error: "Missing EPIC configuration" });
        }
        // Get the OAuth 2.0 token endpoint from EPIC's well-known configuration
        const wellKnownUrl = `${fhirUrl}.well-known/smart-configuration`;
        console.log("Fetching EPIC config from:", wellKnownUrl);
        const configResponse = await fetch(wellKnownUrl);
        if (!configResponse.ok) {
            const configError = await configResponse.text();
            console.error("EPIC config error:", configResponse.status, configError);
            throw new Error(`Failed to fetch EPIC well-known config: ${configResponse.status}`);
        }
        const config = await configResponse.json();
        const tokenEndpoint = config.token_endpoint;
        if (!tokenEndpoint) {
            throw new Error("No token_endpoint in EPIC SMART configuration");
        }
        console.log("Token endpoint:", tokenEndpoint);
        // Exchange authorization code for access token
        const tokenBody = new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            client_id: clientId,
            redirect_uri: redirectUri,
            code_verifier: code_verifier || "",
        });
        console.log("Exchanging code for token...");
        const tokenResponse = await fetch(tokenEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: tokenBody.toString(),
        });
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("Token exchange failed:", tokenResponse.status, errorText);
            throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
        }
        const tokens = await tokenResponse.json();
        // Fetch patient data using the access token
        let patientData = null;
        if (tokens.patient) {
            try {
                console.log("Fetching patient data for:", tokens.patient);
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
            }
            catch (err) {
                console.error("Error fetching patient data:", err);
            }
        }
        // Return tokens and patient data
        return res.json({
            access_token: tokens.access_token,
            token_type: tokens.token_type,
            expires_in: tokens.expires_in,
            refresh_token: tokens.refresh_token,
            patient: tokens.patient,
            patientData: patientData,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Token exchange error:", message);
        return res.status(500).json({
            error: "token_exchange_failed",
            message: message,
        });
    }
});
// Serve static files from dist
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));
// SPA routing: serve index.html for all non-API routes
app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map