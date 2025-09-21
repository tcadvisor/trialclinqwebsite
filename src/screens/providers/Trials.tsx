import React from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";

export default function ProviderTrials(): JSX.Element {
  const [query, setQuery] = React.useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a future iteration, this could navigate to a linking flow or show results
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl sm:text-4xl font-semibold text-center">Active Clinical Trials</h1>
        <p className="mt-2 text-center text-gray-600">
          Link your ongoing trials to TrialCliniq for faster patient match opportunities. You can search existing trials
          from ClinicalTrials.gov or add them manually.
        </p>

        <section className="mt-8 space-y-5">
          <div className="rounded-2xl border bg-white p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-medium">Register a Clinical Trial</div>
                <p className="text-sm text-gray-600 mt-1">
                  If your trial isn’t available via search, you can manually register it here to connect with eligible participants.
                </p>
              </div>
              <Link
                to="#"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
                aria-label="Add Trial Manually"
              >
                Add Trial Manually <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-gray-700">Search from ClinicalTrials.gov</div>
            <form onSubmit={onSubmit} className="mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-full border px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Trial NCT Number or Keyword"
                  aria-label="Enter Trial NCT Number or Keyword"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-gray-900 px-4 py-2 text-white text-sm hover:bg-black"
                >
                  Search
                </button>
              </div>
            </form>
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              Your data stays private and protected with HIPAA-compliant security.
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t mt-16">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-6 text-sm text-gray-600 flex items-center justify-between">
          <span>Copyright © 2025 TrialCliniq.</span>
          <span>Terms · Privacy</span>
        </div>
      </footer>
    </div>
  );
}
