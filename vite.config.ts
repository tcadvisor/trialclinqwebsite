import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import { defineConfig } from "vite";
import path from "path";

// Token exchange middleware for development
function epicTokenExchangePlugin() {
  return {
    name: 'epic-token-exchange',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions/epic-token-exchange', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const { code, code_verifier } = data;

            if (!code) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing authorization code' }));
              return;
            }

            const clientId = process.env.VITE_EPIC_CLIENT_ID;
            const fhirUrl = process.env.VITE_EPIC_FHIR_URL;
            const redirectUri = process.env.VITE_EPIC_REDIRECT_URI;

            console.log('[DEV TOKEN EXCHANGE] Config:', {
              clientId: clientId ? `${clientId.substring(0, 8)}...` : 'MISSING',
              fhirUrl: fhirUrl ? `${fhirUrl.substring(0, 30)}...` : 'MISSING',
              redirectUri: redirectUri ? `${redirectUri.substring(0, 40)}...` : 'MISSING',
            });

            if (!clientId || !fhirUrl || !redirectUri) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing EPIC configuration' }));
              return;
            }

            console.log('[DEV TOKEN EXCHANGE] Fetching EPIC well-known configuration');
            const wellKnownUrl = `${fhirUrl}.well-known/smart-configuration`;
            const configResponse = await fetch(wellKnownUrl);

            if (!configResponse.ok) {
              throw new Error(`Failed to fetch EPIC well-known config: ${configResponse.status}`);
            }

            const config = await configResponse.json();
            const tokenEndpoint = config.token_endpoint;

            if (!tokenEndpoint) {
              throw new Error('No token_endpoint in EPIC SMART configuration');
            }

            console.log('[DEV TOKEN EXCHANGE] Token endpoint:', tokenEndpoint);

            const tokenBody = new URLSearchParams({
              grant_type: 'authorization_code',
              code: code,
              client_id: clientId,
              redirect_uri: redirectUri,
              code_verifier: code_verifier || '',
            });

            console.log('[DEV TOKEN EXCHANGE] Exchanging code for tokens');
            const tokenResponse = await fetch(tokenEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: tokenBody.toString(),
            });

            if (!tokenResponse.ok) {
              const errorText = await tokenResponse.text();
              console.error('[DEV TOKEN EXCHANGE] Token exchange failed:', errorText);
              throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
            }

            const tokens = await tokenResponse.json();
            console.log('[DEV TOKEN EXCHANGE] Tokens received successfully');

            let patientData = null;
            if (tokens.patient) {
              try {
                console.log('[DEV TOKEN EXCHANGE] Fetching patient data');
                const patientRes = await fetch(`${fhirUrl}Patient/${tokens.patient}`, {
                  headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                  },
                });

                if (patientRes.ok) {
                  const patient = await patientRes.json();

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
                  console.log('[DEV TOKEN EXCHANGE] Patient data fetched successfully');
                }
              } catch (err) {
                console.error('[DEV TOKEN EXCHANGE] Error fetching patient data:', err);
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              access_token: tokens.access_token,
              token_type: tokens.token_type,
              expires_in: tokens.expires_in,
              refresh_token: tokens.refresh_token,
              patient: tokens.patient,
              patientData: patientData,
            }));
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[DEV TOKEN EXCHANGE] Error:', message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'token_exchange_failed',
              message: message,
            }));
          }
        });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), epicTokenExchangePlugin()],
  publicDir: "./static",
  base: "./",
  css: {
    postcss: {
      plugins: [tailwind()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
