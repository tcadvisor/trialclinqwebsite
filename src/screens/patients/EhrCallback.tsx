import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

type Stage = "loading" | "success" | "error";

export default function EhrCallback(): JSX.Element {
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string>("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[EPIC CALLBACK] Starting OAuth callback handler...");

        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        console.log("[EPIC CALLBACK] URL Parameters:", {
          code: code ? `${code.substring(0, 20)}...` : "NOT FOUND",
          error: errorParam || "none",
          errorDescription: errorDescription || "none",
        });

        if (errorParam) {
          const errorMsg = `EPIC Authorization failed: ${errorParam}${errorDescription ? ` - ${errorDescription}` : ""}`;
          console.error(`[EPIC CALLBACK] ${errorMsg}`);
          setError(errorMsg);
          setStage("error");
          return;
        }

        if (!code) {
          const msg = "No authorization code received from EPIC. This typically means: 1) User denied authorization, 2) Redirect URI doesn't match EPIC settings, or 3) OAuth configuration is incorrect.";
          console.error(`[EPIC CALLBACK] ${msg}`);
          setError(msg);
          setStage("error");
          return;
        }

        console.log("[EPIC CALLBACK] Step 1: Authorization code received successfully");

        // Get code_verifier from localStorage (set during authorization request)
        const codeVerifier = localStorage.getItem("epic_code_verifier");
        const state = localStorage.getItem("epic_state");

        console.log("[EPIC CALLBACK] Step 2: Checking local storage:", {
          hasCodeVerifier: !!codeVerifier,
          verifierLength: codeVerifier?.length || 0,
          hasState: !!state,
        });

        if (!codeVerifier) {
          const msg = "Missing code verifier in session storage. This means the popup window lost connection to the original window. Session may have expired or local storage was cleared.";
          console.error(`[EPIC CALLBACK] ${msg}`);
          setError(msg);
          setStage("error");
          return;
        }

        console.log("[EPIC CALLBACK] Step 3: Exchanging authorization code for token...");

        let exchangeResponse: Response;

        try {
          const requestBody = {
            code: code,
            code_verifier: codeVerifier,
          };

          console.log("[EPIC CALLBACK] Sending token exchange request to /.netlify/functions/epic-token-exchange");

          exchangeResponse = await fetch("/.netlify/functions/epic-token-exchange", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          console.log("[EPIC CALLBACK] Step 4: Token exchange response received:", {
            status: exchangeResponse.status,
            statusText: exchangeResponse.statusText,
            headers: {
              contentType: exchangeResponse.headers.get("content-type"),
              contentLength: exchangeResponse.headers.get("content-length"),
            },
          });
        } catch (fetchError) {
          console.error("[EPIC CALLBACK] Step 4: Failed to reach token exchange function:", fetchError);
          const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
          throw new Error(
            `Could not connect to token exchange server (/.netlify/functions/epic-token-exchange). Error: ${msg}. This means the Netlify serverless function is not deployed or accessible.`
          );
        }

        if (!exchangeResponse.ok) {
          console.log("[EPIC CALLBACK] Step 5: Token exchange returned error status");
          let errorMessage = `Token exchange failed with status ${exchangeResponse.status} ${exchangeResponse.statusText}`;
          try {
            const contentType = exchangeResponse.headers.get("content-type");
            console.log("[EPIC CALLBACK] Error response content-type:", contentType);

            if (contentType && contentType.includes("application/json")) {
              const errorData = await exchangeResponse.json();
              console.log("[EPIC CALLBACK] Error data:", errorData);
              errorMessage = errorData.message || errorData.error || errorMessage;
            } else {
              const errorText = await exchangeResponse.text();
              console.error("[EPIC CALLBACK] Error response text:", errorText.substring(0, 300));
              errorMessage = errorText ? `Server returned: ${errorText.substring(0, 150)}` : errorMessage;
            }
          } catch (e) {
            console.error("[EPIC CALLBACK] Failed to parse error response:", e);
          }
          throw new Error(errorMessage);
        }

        console.log("[EPIC CALLBACK] Step 5: Token exchange successful, parsing response...");

        let tokenData: any;
        try {
          const contentType = exchangeResponse.headers.get("content-type");
          console.log("[EPIC CALLBACK] Success response content-type:", contentType);

          if (contentType && contentType.includes("application/json")) {
            tokenData = await exchangeResponse.json();
          } else {
            const responseText = await exchangeResponse.text();
            console.error("[EPIC CALLBACK] Unexpected response type, got text:", responseText.substring(0, 200));
            throw new Error(`Expected JSON response, got content-type: ${contentType}`);
          }

          console.log("[EPIC CALLBACK] Step 6: Token data parsed successfully:", {
            hasAccessToken: !!tokenData.access_token,
            hasPatient: !!tokenData.patient,
            hasRefreshToken: !!tokenData.refresh_token,
            patientId: tokenData.patient,
          });
        } catch (parseError) {
          console.error("[EPIC CALLBACK] Failed to parse token exchange response:", parseError);
          throw new Error(
            `Failed to parse server response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          );
        }

        // Save tokens and patient data
        console.log("[EPIC CALLBACK] Step 7: Saving tokens to localStorage...");

        localStorage.setItem(
          "epic:tokens:v1",
          JSON.stringify({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type,
            expires_in: tokenData.expires_in,
            refresh_token: tokenData.refresh_token,
            patient: tokenData.patient,
          })
        );

        if (tokenData.patientData) {
          console.log("[EPIC CALLBACK] Step 8: Saving patient data to localStorage...");
          localStorage.setItem(
            "epic:patient:v1",
            JSON.stringify({
              patientId: tokenData.patient,
              patientData: tokenData.patientData,
              connectedAt: new Date().toISOString(),
            })
          );
        }

        console.log("[EPIC CALLBACK] SUCCESS: All tokens and data saved. Authorization complete!");
        setStage("success");

        // Close popup window if opened from popup (window.opener exists)
        if (window.opener) {
          console.log("[EPIC CALLBACK] Closing popup window (opened from popup)");
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          // If opened directly, redirect to health profile after 2 seconds
          console.log("[EPIC CALLBACK] Redirecting to health profile (direct navigation)");
          setTimeout(() => {
            navigate("/patients/health-profile", {
              state: { epicConnected: true, patientData: tokenData.patientData },
            });
          }, 2000);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        const fullError = `OAuth Callback Error:\n\n${message}\n\nFor debugging, check the browser console (F12 → Console) for detailed step-by-step logs marked with [EPIC CALLBACK].`;

        console.error("[EPIC CALLBACK] FATAL ERROR:", err);
        console.error("[EPIC CALLBACK] Full error context:", {
          errorMessage: message,
          errorType: err instanceof Error ? err.constructor.name : typeof err,
          timestamp: new Date().toISOString(),
        });

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
