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
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (errorParam) {
          setError(`EPIC Authorization failed: ${errorParam} - ${errorDescription || ""}`);
          setStage("error");
          return;
        }

        if (!code) {
          setError("No authorization code received from EPIC");
          setStage("error");
          return;
        }

        // Get code_verifier from sessionStorage (set during authorization request)
        const codeVerifier = sessionStorage.getItem("epic_code_verifier");

        if (!codeVerifier) {
          setError("Missing code verifier - session may have expired");
          setStage("error");
          return;
        }

        // Exchange code for token using Netlify function (server-side)
        console.log("Exchanging authorization code for token...");
        let exchangeResponse: Response;

        try {
          exchangeResponse = await fetch("/.netlify/functions/epic-token-exchange", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: code,
              code_verifier: codeVerifier,
            }),
          });
        } catch (fetchError) {
          console.error("Failed to reach token exchange function:", fetchError);
          throw new Error(
            "Token exchange failed - server function not available. Try refreshing the page or try again in production."
          );
        }

        if (!exchangeResponse.ok) {
          let errorMessage = `Token exchange failed: ${exchangeResponse.status}`;
          try {
            const errorData = await exchangeResponse.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            const errorText = await exchangeResponse.text();
            console.error("Token exchange error response:", errorText);
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        let tokenData: any;
        try {
          tokenData = await exchangeResponse.json();
        } catch (parseError) {
          console.error("Failed to parse token exchange response:", parseError);
          const responseText = await exchangeResponse.text();
          console.error("Response text:", responseText);
          throw new Error(`Invalid response from token exchange: ${responseText.substring(0, 100)}`);
        }

        // Save tokens and patient data
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
          localStorage.setItem(
            "epic:patient:v1",
            JSON.stringify({
              patientId: tokenData.patient,
              patientData: tokenData.patientData,
              connectedAt: new Date().toISOString(),
            })
          );
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
        setError(message);
        setStage("error");
        console.error("Callback error:", err);
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
            <p className="mt-2 text-gray-600">{error}</p>
            {error.includes("server function not available") && (
              <p className="mt-2 text-sm text-gray-500">
                Note: Token exchange requires the production deployment. In development, please test on the deployed
                version.
              </p>
            )}
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
