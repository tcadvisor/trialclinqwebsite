import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRealMatchedTrialsForCurrentUser, type LiteTrial } from "../../lib/matching";
import PatientHeader from "../../components/PatientHeader";
import { useAuth } from "../../lib/auth";
import { computeProfileCompletion } from "../../lib/profile";

export default function Dashboard(): JSX.Element {
  const { user } = useAuth();
  const name = user ? `${user.firstName} ${user.lastName}` : "";
  const [progress, setProgress] = useState(() => computeProfileCompletion());
  const [items, setItems] = useState<LiteTrial[]>([]);
  const [fallbackItems, setFallbackItems] = useState<LiteTrial[]>([]);
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyContent, setWhyContent] = useState<string>("");
  const [noResultsWithinRadius, setNoResultsWithinRadius] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const update = async () => {
      try {
        setIsLoadingMatches(true);
        setError(null);
        const list = await getRealMatchedTrialsForCurrentUser(50);
        if (!cancelled) {
          setItems(list);
          setFallbackItems(((list as any).__fallbackSimilar as LiteTrial[] | undefined) || []);
          setNoResultsWithinRadius((list as any).__noResultsWithinRadius === true);
        }
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setFallbackItems([]);
          setNoResultsWithinRadius(false);
          setError(err instanceof Error ? err.message : "Failed to load matches");
        }
      } finally {
        if (!cancelled) setIsLoadingMatches(false);
      }
    };
    update();
    const handler = () => update();
    window.addEventListener("storage", handler);
    window.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", handler as any);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", handler);
      window.removeEventListener("visibilitychange", handler);
      window.removeEventListener("focus", handler as any);
    };
  }, []);
  useEffect(() => {
    const update = () => setProgress(computeProfileCompletion());
    update();
    window.addEventListener("storage", update);
    window.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update as any);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update as any);
    };
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <PatientHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-semibold">Welcome back, {name}</h1>

        {/* Top cards */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">Complete your health profile for better trial matches</div>
              <span className="text-xs text-gray-500">{progress.percent}%</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-green-500" style={{ width: `${progress.percent}%` }} />
            </div>
            <Link to="/patients/health-profile" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 text-white px-3 py-2 text-sm hover:bg-black">
              Complete now
            </Link>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm font-medium">Upload New Medical Record</div>
            <p className="mt-2 text-sm text-gray-600">
              You can quickly upload newly acquired medical records to make trial matches more specific
            </p>
            <input
              ref={(el) => { (window as any).__dashUploadRef = el; }}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    const raw = localStorage.getItem("tc_docs");
                    const list = raw ? (JSON.parse(raw) as any[]) : [];
                    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    const uploadedBy = (name || "You").trim() || "You";
                    const item = {
                      id,
                      name: f.name,
                      type: f.type,
                      size: f.size,
                      uploadedBy,
                      uploadedAt: Date.now(),
                      category: "Diagnostic Reports",
                      url: reader.result as string,
                    };
                    list.unshift(item);
                    localStorage.setItem("tc_docs", JSON.stringify(list));
                    try { window.dispatchEvent(new Event("storage")); } catch {}
                    alert("File added to your records. For detailed summarization, use Health Profile > Documents.");
                  } catch {}
                  // reset input
                  try { (e.target as HTMLInputElement).value = ""; } catch {}
                };
                reader.onerror = () => {
                  try { (e.target as HTMLInputElement).value = ""; } catch {}
                  alert("Failed to read file.");
                };
                reader.readAsDataURL(f);
              }}
            />
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => { const el = (window as any).__dashUploadRef as HTMLInputElement | undefined; el?.click(); }}
            >
              Upload file
            </button>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-600">Consent Status</div>
                <div className="mt-2 text-lg font-semibold text-green-700">Active</div>
              </div>
              <div className="h-8 w-8 rounded-md bg-green-100" />
            </div>
            <div className="mt-2 text-xs text-gray-500">Last updated: 17 Jun, 2025</div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-sm font-medium text-blue-900">Connect Your EHR</div>
            <p className="mt-2 text-sm text-blue-700">
              Securely import your electronic health records from your hospital or clinic to improve trial matching
            </p>
            <Link to="/patients/ehr" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700">
              Connect Now
            </Link>
          </div>
        </div>

        {/* Trial matches */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Trial Matches</h2>
            <div className="flex items-center gap-2">
              <input
                className="w-64 rounded-full border px-4 py-2 text-sm focus:outline-none"
                placeholder="Search"
              />
              <Link
                to="/"
                className="rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                New search
              </Link>
            </div>
          </div>

          {isLoadingMatches && (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Refreshing matches…
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {noResultsWithinRadius && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">⚠️</div>
                <div>
                  <h3 className="font-semibold text-amber-900">No trials found within your search radius</h3>
                  <p className="mt-1 text-sm text-amber-800">We couldn't find any matching trials within your specified distance. Try increasing your travel distance to see more options.</p>
                  <Link to="/patients/health-profile" className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-900 px-4 py-2 text-sm text-white hover:bg-amber-800">
                    Update Location Preferences →
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 backdrop-blur text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Trial Title</th>
                  <th className="px-4 py-3 font-medium">Trial ID</th>
                  <th className="px-4 py-3 font-medium">Trial Status</th>
                  <th className="px-4 py-3 font-medium">Compatibility Score</th>
                  <th className="px-4 py-3 font-medium">Interventions</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 4).map((t) => (
                  <tr key={t.slug} className="border-t hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <Link to={`/study/${t.nctId}`} state={{ score: t.aiScore, rationale: t.aiRationale || t.reason }} className="text-gray-900 hover:underline line-clamp-2">
                        {t.title}
                      </Link>
                      <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-2">
                        {t.location && <span>{t.location}</span>}
                        {t.center && <span className="hidden sm:inline">• {t.center}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 align-top whitespace-nowrap">{t.nctId}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${t.status?.includes('Recruiting') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {t.status === 'Now Recruiting' ? 'Recruiting' : t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top min-w-[180px]">
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-900">{t.aiScore}%</span>
                        {(t.aiRationale || t.reason) && (
                          <button
                            type="button"
                            onClick={() => { setWhyContent(`${t.title}\n\n${t.aiRationale || t.reason}`); setWhyOpen(true); }}
                            className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                            aria-label="Why this match"
                          >
                            Why
                          </button>
                        )}
                      </div>
                      {(t.aiRationale || t.reason) && (
                        <div className="mt-1 text-[11px] text-gray-500 line-clamp-2">{t.aiRationale || t.reason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 align-top max-w-[220px]">
                      <div className="line-clamp-2">{t.interventions.join(' / ')}</div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <a href={`https://clinicaltrials.gov/study/${encodeURIComponent(t.nctId)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50 whitespace-nowrap">View on ClinicalTrials.gov</a>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      <div className="max-w-xl mx-auto text-center">
                        <div className="text-gray-900 font-medium">We couldn't match you to specific trials right now.</div>
                        <p className="mt-1 text-sm text-gray-600">We’ll show similar options when they’re available. Updating your health profile or widening your travel radius can help us find closer matches.</p>
                        <Link to="/patients/health-profile" className="mt-3 inline-flex items-center justify-center rounded-full bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
                          Update preferences
                        </Link>
                        {fallbackItems.length > 0 && (
                          <div className="mt-5 text-left">
                            <div className="text-sm font-semibold text-gray-800">Similar trials outside your radius</div>
                            <ul className="mt-2 space-y-2">
                              {fallbackItems.slice(0, 4).map((t) => (
                                <li key={t.slug} className="rounded-lg border p-3 bg-gray-50">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <Link to={`/study/${t.nctId}`} state={{ score: t.aiScore, rationale: t.aiRationale || t.reason }} className="text-sm font-medium text-gray-900 hover:underline">
                                        {t.title}
                                      </Link>
                                      <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-2">
                                        {t.location && <span>{t.location}</span>}
                                        {t.center && <span className="hidden sm:inline">• {t.center}</span>}
                                        {typeof (t as any).distanceMi === 'number' && <span className="text-gray-500">• {(t as any).distanceMi} mi away</span>}
                                      </div>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] text-gray-700">Outside your radius</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Link to="/patients/eligible?page=1" className="border-t px-4 py-3 block text-sm text-gray-600 hover:bg-gray-50 text-center">See more</Link>
          </div>
        </section>
      </main>

      {whyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setWhyOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Why this trial matches you</h3>
              <button className="rounded-md p-1 text-gray-500 hover:bg-gray-100" onClick={() => setWhyOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{whyContent}</div>
          </div>
        </div>
      )}
    </div>
  );
}
