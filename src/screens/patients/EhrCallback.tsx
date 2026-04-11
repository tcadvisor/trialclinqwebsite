import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { setEpicTokens, setEpicPatientData } from "../../lib/tokenManager";

type Stage = "loading" | "success" | "error";

export default function EhrCallback(): JSX.Element {
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string>("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (errorParam) {
          const errorMsg = `EPIC Authorization failed: ${errorParam}${errorDescription ? ` - ${errorDescription}` : ""}`;
          setError(errorMsg);
          setStage("error");
          return;
        }

        if (!code) {
          const msg = "No authorization code received from EPIC. This typically means: 1) User denied authorization, 2) Redirect URI doesn't match EPIC settings, or 3) OAuth configuration is incorrect.";
          setError(msg);
          setStage("error");
          return;
        }

        // Get code_verifier from localStorage (set during authorization request)
        const codeVerifier = localStorage.getItem("epic_code_verifier");
        const savedState = localStorage.getItem("epic_state");
        const returnedState = searchParams.get("state");

        // Validate OAuth state parameter to prevent CSRF attacks
        if (savedState && returnedState && savedState !== returnedState) {
          setError("OAuth state mismatch -- possible CSRF attack. Please try connecting again.");
          setStage("error");
          return;
        }

        if (!codeVerifier) {
          const msg = "Missing code verifier in local storage. Local storage may have been cleared, or the initial EPIC connection did not complete properly. Please try the connection again.";
          setError(msg);
          setStage("error");
          return;
        }

        let exchangeResponse: Response;

        try {
          const requestBody = {
            code: code,
            code_verifier: codeVerifier,
          };

          exchangeResponse = await fetch("/api/epic-token-exchange", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });
        } catch (fetchError) {
          const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
          throw new Error(
            `Could not connect to token exchange server (/api/epic-token-exchange). Error: ${msg}. This means the Azure serverless function is not deployed or accessible.`
          );
        }

        if (!exchangeResponse.ok) {
          let errorMessage = `Token exchange failed with status ${exchangeResponse.status} ${exchangeResponse.statusText}`;
          try {
            const contentType = exchangeResponse.headers.get("content-type");

            if (contentType && contentType.includes("application/json")) {
              const errorData = await exchangeResponse.json();
              errorMessage = errorData.message || errorData.error || errorMessage;
            } else {
              const errorText = await exchangeResponse.text();
              errorMessage = errorText ? `Server returned: ${errorText.substring(0, 150)}` : errorMessage;
            }
          } catch (e) {
            // Failed to parse error response
          }
          throw new Error(errorMessage);
        }

        let tokenData: any;
        try {
          const contentType = exchangeResponse.headers.get("content-type");

          if (contentType && contentType.includes("application/json")) {
            tokenData = await exchangeResponse.json();
          } else {
            const responseText = await exchangeResponse.text();
            throw new Error(`Expected JSON response, got content-type: ${contentType}`);
          }
        } catch (parseError) {
          throw new Error(
            `Failed to parse server response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          );
        }

        // SECURITY UPDATE: Save tokens in memory (NOT localStorage)
        // Tokens are now stored securely in memory and cleared on page refresh
        setEpicTokens({
          access_token: tokenData.access_token,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          refresh_token: tokenData.refresh_token,
          patient: tokenData.patient,
        });

        // Clean up temporary PKCE values
        localStorage.removeItem("epic_code_verifier");
        localStorage.removeItem("epic_state");

        if (tokenData.patientData) {

          // Extract and normalize EPIC patient data for profile autofill
          const epicData = tokenData.patientData;
          const syncedAt = new Date().toISOString();
          const syncedAtDisplay = new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          // Build profile fields from EPIC data with source tracking
          const epicProfileData: Record<string, { value: any; source: string; syncedAt: string }> = {};

          // Autofill basic demographics
          if (epicData.name) {
            epicProfileData.name = { value: epicData.name, source: 'epic', syncedAt };
          }
          if (epicData.gender) {
            const genderMap: Record<string, string> = {
              'male': 'Male',
              'female': 'Female',
              'other': 'Non-binary',
            };
            const normalizedGender = genderMap[epicData.gender.toLowerCase()] || epicData.gender;
            epicProfileData.gender = { value: normalizedGender, source: 'epic', syncedAt };
          }
          if (epicData.birthDate) {
            const birthDate = new Date(epicData.birthDate);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            epicProfileData.age = { value: String(age), source: 'epic', syncedAt };
          }

          // Medications
          if (epicData.medications && Array.isArray(epicData.medications.entry)) {
            const medications = epicData.medications.entry.map((entry: any) => {
              const resource = entry.resource || {};
              return {
                name: resource.medicationCodeableConcept?.text || resource.medicationReference?.display || 'Unknown Medication',
                dose: resource.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.value
                  ? `${resource.dosageInstruction[0].doseAndRate[0].doseQuantity.value} ${resource.dosageInstruction[0].doseAndRate[0].doseQuantity.unit || ''}`
                  : undefined,
                schedule: resource.dosageInstruction?.[0]?.timing?.repeat?.frequency
                  ? `${resource.dosageInstruction[0].timing.repeat.frequency}x daily`
                  : undefined,
              };
            });
            if (medications.length > 0) {
              epicProfileData.medications = { value: medications, source: 'epic', syncedAt };
            }
          }

          // Allergies
          if (epicData.allergies && Array.isArray(epicData.allergies.entry)) {
            const allergies = epicData.allergies.entry.map((entry: any) => {
              const resource = entry.resource || {};
              return {
                name: resource.code?.text || resource.code?.coding?.[0]?.display || 'Unknown Allergy',
                reaction: resource.reaction?.[0]?.manifestation?.[0]?.text || undefined,
                severity: resource.reaction?.[0]?.severity || undefined,
              };
            });
            if (allergies.length > 0) {
              epicProfileData.allergies = { value: allergies, source: 'epic', syncedAt };
            }
          }

          // Conditions
          if (epicData.conditions && Array.isArray(epicData.conditions.entry)) {
            const conditions = epicData.conditions.entry.map((entry: any) => {
              const resource = entry.resource || {};
              return resource.code?.text || resource.code?.coding?.[0]?.display || 'Unknown Condition';
            });
            if (conditions.length > 0) {
              const primaryCondition = conditions[0];
              epicProfileData.primaryCondition = { value: primaryCondition, source: 'epic', syncedAt };
            }
          }

          // SECURITY UPDATE: Store patient data in memory (NOT localStorage)
          setEpicPatientData({
            patientId: tokenData.patient,
            patientData: tokenData.patientData,
            profileData: epicProfileData,
            syncedAt: syncedAt,
            syncedAtDisplay: syncedAtDisplay,
          });
        }

        setStage("success");

        // Close popup window if opened from popup (window.opener exists)
        if (window.opener) {
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          // If opened directly, redirect to health profile after 2 seconds
          setTimeout(() => {
            navigate("/patients/health-profile", {
              state: { epicConnected: true, patientData: tokenData.patientData },
            });
          }, 2000);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        const fullError = `OAuth Callback Error:\n\n${message}\n\nFor debugging, check the browser console (F12 → Console) for detailed step-by-step logs marked with [EPIC CALLBACK].`;

        setError(fullError);
        setStage("error");
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-4 py-16">
        {stage === "loading" && (
          <div className="text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <h1 className="mt-6 text-2xl font-semibold">Connecting to EPIC...</h1>
            <p className="mt-2 text-gray-600">Retrieving your health information securely.</p>
          </div>
        )}

        {stage === "success" && (
          <div className="text-center">
            <div className="inline-block w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-6 text-2xl font-semibold">Connected Successfully!</h1>
            <p className="mt-2 text-gray-600">Your EPIC health data has been imported. Redirecting...</p>
          </div>
        )}

        {stage === "error" && (
          <div className="text-center">
            <div className="inline-block w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mt-6 text-2xl font-semibold">Connection Failed</h1>
            <div className="mt-4 text-left bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-lg mx-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{error}</p>
            </div>
            <div className="mt-4 text-left bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
              <p className="text-xs text-blue-900 font-semibold mb-2">💡 Troubleshooting Tips:</p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Open Developer Tools (F12) and go to the Console tab</li>
                <li>Look for logs starting with [EPIC] or [EPIC CALLBACK]</li>
                <li>Check the "Network" tab to see the actual HTTP requests and responses</li>
                <li>Verify your redirect URI matches what's configured in the EPIC developer portal</li>
                <li>Ensure environment variables are set: VITE_EPIC_CLIENT_ID, VITE_EPIC_REDIRECT_URI, VITE_EPIC_FHIR_URL</li>
              </ul>
            </div>
            <button
              onClick={() => navigate("/patients/ehr")}
              className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
