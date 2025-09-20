import React from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function ProviderWelcome(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="px-4 py-10">
        <div className="max-w-xl mx-auto">
          <div className="rounded-2xl border bg-white shadow-md">
            <div className="px-6 sm:px-8 py-8">
              <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 grid place-items-center text-blue-600">✓</div>
              <h1 className="mt-4 text-center text-lg font-semibold">You're in!</h1>
              <p className="mt-1 text-center text-sm text-gray-600">
                Welcome to TrialCliniq for Research Sites. Start managing your trials, review participant matches, and optimize your site's enrollment performance.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <Link to="/sites/multicenter" className="flex-1 rounded-full border px-4 py-2 text-sm text-center hover:bg-gray-50">
                  Add New Trial Listing
                </Link>
                <button
                  type="button"
                  onClick={() => navigate("/providers/login")}
                  className="flex-1 rounded-full bg-[#1033e5] px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  My Dashboard
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-600">
                <span role="img" aria-label="lock">🔒</span>
                <span>Your data stays private and protected with HIPAA-compliant security.</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
