import React from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { trials } from "../../lib/trials";

export default function Welcome(): JSX.Element {
  const navigate = useNavigate();
  const featured = trials.slice(0, 2);
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
                Your TrialCliniq account is ready. Let's help you discover clinical trials tailored to your medical profile.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/patients/health-profile")}
                  className="flex-1 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Complete My Health Profile
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/patients/dashboard")}
                  className="flex-1 rounded-full bg-[#1033e5] px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  My Dashboard
                </button>
              </div>

              <div className="mt-6 border-t pt-4">
                <div className="mb-3 text-sm font-medium flex items-center gap-2">
                  <span role="img" aria-label="thumbs-up">👍🏻</span>
                  <span>You're a good match for these trials</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {featured.map((t) => (
                    <div key={t.slug} className="rounded-xl border p-4">
                      <div className="text-sm font-semibold line-clamp-2">{t.title}</div>
                      <div className="mt-1 text-xs text-gray-600">{t.location}</div>
                      <Link
                        to={`/trials/${t.slug}`}
                        className="mt-3 inline-flex items-center rounded-full border px-3 py-1.5 text-xs hover:bg-gray-50"
                      >
                        View trial
                      </Link>
                    </div>
                  ))}
                </div>
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
