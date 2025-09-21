import React from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function ProviderWelcome(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader active={undefined} />
      <main className="relative max-w-5xl mx-auto px-4 py-16">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        <div className="relative mx-auto max-w-xl rounded-2xl border bg-white p-6 sm:p-8 shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-blue-600">
              <path fillRule="evenodd" d="M12 2.25a9.75 9.75 0 1 0 0 19.5 9.75 9.75 0 0 0 0-19.5Zm4.28 7.53a.75.75 0 0 0-1.06-1.06l-4.72 4.72-1.72-1.72a.75.75 0 0 0-1.06 1.06l2.25 2.25c.3.3.77.3 1.06 0l5.25-5.25Z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-center text-xl sm:text-2xl font-semibold">You're in!</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome to TrialCliniq for Research Sites. Start managing your trials, review participant matches, and optimize your site's enrollment performance.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/sites/multicenter")}
              className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Add New Trial Listing
            </button>
            <button
              type="button"
              onClick={() => navigate("/providers/dashboard")}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              My Dashboard
            </button>
          </div>

          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2a9 9 0 1 0 9 9A9.01 9.01 0 0 0 12 2Zm1 13h-2v-2h2Zm0-4h-2V7h2Z"/></svg>
            Your data stays private and protected with HIPAA-compliant security.
          </p>
        </div>
      </main>
    </div>
  );
}
