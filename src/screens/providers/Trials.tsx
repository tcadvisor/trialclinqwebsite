import React from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, Plus } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import { CtgovStudy, fetchStudies, ctgovStudyDetailUrl, formatNearestSitePreview, fetchStudyByNctId } from "../../lib/ctgov";
import { addTrial, getAddedTrials, isTrialAdded } from "../../lib/providerTrials";

export default function ProviderTrials(): JSX.Element {
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [studies, setStudies] = React.useState<CtgovStudy[]>([]);
  const [added, setAdded] = React.useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    getAddedTrials().forEach((t) => { if (t.nctId) map[t.nctId] = true; });
    return map;
  });

  const runSearch = React.useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    try {
      const isNct = /^NCT\d{8}$/i.test(q);
      const res = isNct ? await fetchStudyByNctId(q) : await fetchStudies({ q, pageSize: 12 });
      setStudies(res.studies || []);
      if ((res.studies || []).length === 0) setError("No studies found.");
    } catch (e) {
      setError("Failed to load studies. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
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

            {/* Results */}
            <div className="mt-6 space-y-4">
              {loading && (
                <div className="p-4 text-sm text-gray-600 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              )}
              {!loading && error && (
                <div className="p-4 text-sm border border-red-200 bg-red-50 text-red-700 rounded">{error}</div>
              )}
              {!loading && !error && studies.length > 0 && (
                <ul className="rounded-xl border overflow-hidden">
                  {studies.map((s, i) => {
                    const nctId = s.protocolSection?.identificationModule?.nctId || "";
                    const title = s.protocolSection?.identificationModule?.briefTitle || "Untitled";
                    const status = s.protocolSection?.statusModule?.overallStatus || "";
                    const sponsor = s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || "";
                    const nearest = formatNearestSitePreview(s);
                    const key = `${nctId || "idx"}-${i}`;
                    const already = nctId ? (added[nctId] || isTrialAdded(nctId)) : false;
                    return (
                      <li key={key} className="flex items-center justify-between px-4 py-3 border-t first:border-t-0 bg-white hover:bg-gray-50">
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 truncate">{title}</div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {nctId}{status ? ` · ${status}` : ''}{nearest ? ` · ${nearest}` : ''}{sponsor ? ` · ${sponsor}` : ''}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {!already ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!nctId) return;
                                addTrial({ nctId, title, status, sponsor, nearest });
                                setAdded((m) => ({ ...m, [nctId]: true }));
                              }}
                              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs">Added</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
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
