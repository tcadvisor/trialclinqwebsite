import React from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import { CtgovStudy, fetchStudies, ctgovStudyDetailUrl, formatNearestSitePreview, fetchStudyByNctId } from "../../lib/ctgov";
import { addTrial, getAddedTrials, isTrialAdded } from "../../lib/providerTrials";
import { buildSmartCondQuery, buildLooseCondQuery } from "../../lib/searchQuery";

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
  const [selected, setSelected] = React.useState<{ nctId: string; title: string; status?: string }[]>([]);

  const runSearch = React.useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    try {
      const isNct = /^NCT\d{8}$/i.test(q);
      let res = isNct ? await fetchStudyByNctId(q) : await fetchStudies({ q: buildSmartCondQuery(q), pageSize: 12 });
      if (!isNct && ((res.studies || []).length === 0)) {
        const loose = buildLooseCondQuery(q);
        res = await fetchStudies({ q: loose || q, pageSize: 12 });
      }
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
                    const inSelected = !!(nctId && selected.some((t) => t.nctId === nctId));
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
                          {!already && !inSelected && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!nctId) return;
                                setSelected((prev) => prev.some((t) => t.nctId === nctId) ? prev : [...prev, { nctId, title, status }]);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                          )}
                          {(already || inSelected) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs">{already ? 'Added' : 'Selected'}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selected.length > 0 && (
              <div className="mt-6">
                <div className="rounded-2xl border overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Trial Title</th>
                        <th className="px-4 py-3 font-medium">NCT Number</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.map((t) => (
                        <tr key={t.nctId} className="border-t">
                          <td className="px-4 py-3">{t.title}</td>
                          <td className="px-4 py-3 text-gray-600">{t.nctId}</td>
                          <td className="px-4 py-3">{t.status || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-gray-50 mr-2"
                              disabled
                              title="Edit (coming soon)"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                              onClick={() => setSelected((prev) => prev.filter((x) => x.nctId !== t.nctId))}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      selected.forEach((t) => addTrial({ nctId: t.nctId, title: t.title, status: t.status }));
                      const map: Record<string, boolean> = {};
                      selected.forEach((t) => { map[t.nctId] = true; });
                      setAdded((m) => ({ ...m, ...map }));
                      setSelected([]);
                    }}
                    className="w-full inline-flex items-center justify-center rounded-full bg-[#1033e5] px-4 py-3 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    Confirm & Add Trials
                  </button>
                </div>
              </div>
            )}
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
