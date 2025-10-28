import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3001;

app.post('/netlify/functions/epic-token-exchange', async (req, res) => {
  try {
    console.log('[TOKEN EXCHANGE] Received request');
    const { code, code_verifier } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const clientId = process.env.VITE_EPIC_CLIENT_ID;
    const fhirUrl = process.env.VITE_EPIC_FHIR_URL;
    const redirectUri = process.env.VITE_EPIC_REDIRECT_URI;

    console.log('[TOKEN EXCHANGE] Config:', { 
      clientId: clientId ? `${clientId.substring(0, 8)}...` : 'MISSING',
      fhirUrl: fhirUrl ? `${fhirUrl.substring(0, 30)}...` : 'MISSING',
      redirectUri: redirectUri ? `${redirectUri.substring(0, 40)}...` : 'MISSING',
    });

    if (!clientId || !fhirUrl || !redirectUri) {
      return res.status(500).json({ error: 'Missing EPIC configuration' });
    }

    console.log('[TOKEN EXCHANGE] Fetching EPIC well-known configuration');
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

    console.log('[TOKEN EXCHANGE] Token endpoint:', tokenEndpoint);

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: code_verifier || '',
    });

    console.log('[TOKEN EXCHANGE] Exchanging code for tokens');
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[TOKEN EXCHANGE] Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    console.log('[TOKEN EXCHANGE] Tokens received successfully');

    let patientData = null;
    if (tokens.patient) {
      try {
        console.log('[TOKEN EXCHANGE] Fetching patient data');
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
          console.log('[TOKEN EXCHANGE] Patient data fetched successfully');
        }
      } catch (err) {
        console.error('[TOKEN EXCHANGE] Error fetching patient data:', err);
      }
    }

    res.json({
      access_token: tokens.access_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      refresh_token: tokens.refresh_token,
      patient: tokens.patient,
      patientData: patientData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[TOKEN EXCHANGE] Error:', message);
    res.status(500).json({
      error: 'token_exchange_failed',
      message: message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Token exchange server running on http://localhost:${PORT}`);
  console.log(`📡 Forwarding requests to: /netlify/functions/epic-token-exchange\n`);
});
