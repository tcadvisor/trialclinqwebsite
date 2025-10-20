import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { ChevronDownIcon, MapPinIcon, Loader2 } from "lucide-react";
import HomeHeader from "../components/HomeHeader";
import { buildSmartCondQuery, buildLooseCondQuery, normalizeLocation } from "../lib/searchQuery";
import {
  CtgovResponse,
  CtgovStudy,
  fetchStudies,
  formatNearestSitePreview,
  ctgovStudyDetailUrl,
  fetchStudyByNctId,
} from "../lib/ctgov";

const solutionsLinks = ["Find a study", "More about trials", "How TrialCliniq help", "Blog"];
const companyLinks = ["Terms of Conditions", "Contact Us", "About Us", "Privacy Policy"];

export const SearchResults = (): JSX.Element => {
  const { search } = useLocation();

  const params = React.useMemo(() => new URLSearchParams(search), [search]);
  const initialQ = params.get("q")?.trim() || "breast cancer";
  const initialLoc = params.get("loc")?.trim() || "";
  const initialStatus = (params.get("status")?.trim().toUpperCase() || "RECRUITING");

  const [q, setQ] = React.useState<string>(initialQ);
  const [loc, setLoc] = React.useState<string>(initialLoc);
  const [tempQ, setTempQ] = React.useState<string>(initialQ);
  const [tempLoc, setTempLoc] = React.useState<string>(initialLoc);
  const [tempStatus, setTempStatus] = React.useState<string>(initialStatus);
  const [tempType, setTempType] = React.useState<string>("");
  const [tempPageSize, setTempPageSize] = React.useState<number>(12);
  const preparedQ = React.useMemo(() => buildSmartCondQuery(q), [q]);
  const preparedLoc = React.useMemo(() => normalizeLocation(loc), [loc]);
  const [status, setStatus] = React.useState<string>(initialStatus);
  const [type, setType] = React.useState<string>("");
  const [pageSize, setPageSize] = React.useState<number>(12);
  const [page, setPage] = React.useState<number>(1);
  const [pageToken, setPageToken] = React.useState<string>("");
  const tokenMapRef = React.useRef<Record<number, string>>({ 1: "" });
  const [activeQuery, setActiveQuery] = React.useState<{ qq: string; st?: string; lc?: string } | null>(null);

  const [data, setData] = React.useState<CtgovResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  const handleApplyFilters = () => {
    setQ(tempQ);
    setLoc(tempLoc);
    setStatus(tempStatus);
    setType(tempType);
    setPageSize(tempPageSize);
    setPage(1);
  };

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const isNct = /^NCT\d{8}$/i.test(q.trim());
        let res: CtgovResponse = { studies: [] };
        let used: { qq: string; st?: string; lc?: string } | null = null;
        if (isNct) {
          res = await fetchStudyByNctId(q.trim());
          used = { qq: q.trim(), st: '', lc: '' };
        } else {
          const loose = buildLooseCondQuery(q);
          const isBroadUSLocation = preparedLoc && /^\s*(usa?|united\s+states?)\s*$/i.test(preparedLoc);
          const attempts: Array<{ qq: string; st?: string; lc?: string }> = [];

          // If location is a broad "USA" search, try with location first but don't fall back to worldwide
          // For specific locations, allow broader fallbacks if few results
          if (isBroadUSLocation) {
            // US-only searches: keep location constraint
            attempts.push({ qq: preparedQ, st: status, lc: preparedLoc });
            if (loose && loose !== preparedQ) attempts.push({ qq: loose, st: status, lc: preparedLoc });
            attempts.push({ qq: q.trim(), st: status, lc: preparedLoc });
            attempts.push({ qq: preparedQ, st: '', lc: preparedLoc });
            attempts.push({ qq: loose || preparedQ || q.trim(), st: '', lc: preparedLoc });
          } else if (preparedLoc) {
            // Specific location: try with location first, then fallback to broader searches
            attempts.push({ qq: preparedQ, st: status, lc: preparedLoc });
            if (loose && loose !== preparedQ) attempts.push({ qq: loose, st: status, lc: preparedLoc });
            attempts.push({ qq: q.trim(), st: status, lc: preparedLoc });
            attempts.push({ qq: preparedQ, st: status, lc: '' });
            if (loose && loose !== preparedQ) attempts.push({ qq: loose, st: status, lc: '' });
            attempts.push({ qq: q.trim(), st: status, lc: '' });
            attempts.push({ qq: preparedQ, st: '', lc: preparedLoc });
            attempts.push({ qq: loose || preparedQ || q.trim(), st: '', lc: preparedLoc });
            attempts.push({ qq: preparedQ, st: '', lc: '' });
            attempts.push({ qq: loose || preparedQ || q.trim(), st: '', lc: '' });
          } else {
            // No location specified
            attempts.push({ qq: preparedQ, st: status, lc: '' });
            if (loose && loose !== preparedQ) attempts.push({ qq: loose, st: status, lc: '' });
            attempts.push({ qq: q.trim(), st: status, lc: '' });
            attempts.push({ qq: preparedQ, st: '', lc: '' });
            attempts.push({ qq: loose || preparedQ || q.trim(), st: '', lc: '' });
          }

          if (page > 1 || pageToken) {
            const a = activeQuery || attempts[0];
            used = a;
            res = await fetchStudies({ q: a.qq, status: a.st, type, loc: a.lc, pageSize, pageToken });
          } else {
            for (const a of attempts) {
              const r = await fetchStudies({ q: a.qq, status: a.st, type, loc: a.lc, pageSize, pageToken: "" });
              res = r;
              used = a;
              // For broad US searches, always keep results even if few (don't fall back to worldwide)
              // For specific locations, allow fallback if very few results
              if (isBroadUSLocation) {
                // Always accept results for US-specific searches
                if ((r.studies || []).length > 0 || r.nextPageToken !== undefined) break;
              } else {
                // For specific locations, accept if we have results or fallback for broader searches
                if ((r.studies || []).length > 0 || r.nextPageToken !== undefined) break;
              }
            }
          }
        }
        if (!mounted) return;
        setData(res);
        if (used) setActiveQuery(used);
        tokenMapRef.current[page] = pageToken;
        if (res.nextPageToken) {
          tokenMapRef.current[page + 1] = res.nextPageToken;
        }
      } catch (e: any) {
        if (!mounted) return;
        setError("Failed to load studies. Please try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [q, preparedQ, preparedLoc, status, type, pageSize, pageToken, page]);

  React.useEffect(() => {
    tokenMapRef.current = { 1: "" };
    setActiveQuery(null);
    setPage(1);
    setPageToken("");
  }, [preparedQ, preparedLoc, status, type, pageSize]);

  const studies = data?.studies ?? [];

  const { isAuthenticated, user } = useAuth();

  const calcTotalPages = React.useCallback((): number => {
    const apiTotal = Math.ceil(((data?.totalCount || 0)) / pageSize);
    if (apiTotal > 0) return apiTotal;
    const keys = Object.keys(tokenMapRef.current).map((k) => parseInt(k, 10)).filter((n) => !isNaN(n));
    const known = keys.length ? Math.max(...keys) : 1;
    return Math.max(known, page + (data?.nextPageToken ? 1 : 0));
  }, [data?.totalCount, data?.nextPageToken, pageSize, page]);

  return (
    <div className="flex flex-col w-full items-center relative bg-white">
      <HomeHeader />
      <main className="w-full max-w-[1200px] px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-500">Home</span>
          <span className="text-sm text-gray-500">&gt;</span>
          <span className="text-sm text-gray-500">Search results</span>
        </div>

        <h1 className="text-2xl font-semibold mb-2">Clinical trials</h1>
        <div className="mb-6 text-sm text-gray-600">{`We found ${data?.totalCount ?? 0} clinical trial${(data?.totalCount ?? 0) === 1 ? '' : 's'}.`}</div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 space-y-6">
                <h3 className="font-semibold">Refine Your Results</h3>
                <div>
                  <h4 className="font-medium mb-2">Condition</h4>
                  <input
                    type="text"
                    value={tempQ}
                    onChange={(e) => setTempQ(e.target.value)}
                    placeholder="e.g. breast cancer"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Near</h4>
                  <input
                    type="text"
                    value={tempLoc}
                    onChange={(e) => setTempLoc(e.target.value)}
                    placeholder="City, State or ZIP"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Status</h4>
                  <Select
                    value={tempStatus || "any"}
                    onValueChange={(v) => {
                      const next = v === "any" ? "" : v;
                      setTempStatus(next);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="RECRUITING">RECRUITING</SelectItem>
                      <SelectItem value="ACTIVE_NOT_RECRUITING">ACTIVE_NOT_RECRUITING</SelectItem>
                      <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                      <SelectItem value="NOT_YET_RECRUITING">NOT_YET_RECRUITING</SelectItem>
                      <SelectItem value="ENROLLING_BY_INVITATION">ENROLLING_BY_INVITATION</SelectItem>
                      <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                      <SelectItem value="TERMINATED">TERMINATED</SelectItem>
                      <SelectItem value="WITHDRAWN">WITHDRAWN</SelectItem>
                      <SelectItem value="UNKNOWN">UNKNOWN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Study Type</h4>
                  <Select
                    value={tempType || "any"}
                    onValueChange={(v) => {
                      const next = v === "any" ? "" : v;
                      setTempType(next);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="INTERVENTIONAL">INTERVENTIONAL</SelectItem>
                      <SelectItem value="OBSERVATIONAL">OBSERVATIONAL</SelectItem>
                      <SelectItem value="EXPANDED_ACCESS">EXPANDED_ACCESS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Results per page</h4>
                  <Select
                    value={String(tempPageSize)}
                    onValueChange={(v) => {
                      const size = parseInt(v, 10);
                      setTempPageSize(size);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="12" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button
                  onClick={handleApplyFilters}
                  className="w-full rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </CardContent>
            </Card>
          </aside>

          <div className="lg:col-span-3 space-y-6">
            {loading && (
              <div className="p-6 text-center text-gray-600 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading trials…
              </div>
            )}

            {!loading && error && (
              <div className="p-6 border border-red-200 bg-red-50 text-red-800 rounded-md">
                {error}
              </div>
            )}

            {!loading && !error && studies.length === 0 && (
              <div className="p-6 border rounded-md text-gray-600">No studies found. Try changing your filters.</div>
            )}

            {!loading && !error && studies.map((study: CtgovStudy, index: number) => {
              const title = study.protocolSection?.identificationModule?.briefTitle || "Untitled";
              const overallStatus = study.protocolSection?.statusModule?.overallStatus || "";
              const conditions = study.protocolSection?.conditionsModule?.conditions || [];
              const phases = study.protocolSection?.designModule?.phases || [];
              const sponsor = study.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || "";
              const nearest = formatNearestSitePreview(study);
              const nctId = study.protocolSection?.identificationModule?.nctId || "";

              return (
                <Card key={`${nctId}-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <Link to={`/study/${nctId}`} className="hover:underline flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-[#1033e5] mb-1 break-words leading-snug">{title}</h3>
                      </Link>
                      <div className="flex items-center gap-2">
                        {overallStatus && <Badge variant="secondary">{overallStatus}</Badge>}
                        {!(isAuthenticated && user?.role === 'patient') && (
                          <a href={ctgovStudyDetailUrl(study)} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="bg-gray-900 text-white rounded-full whitespace-nowrap">
                              View details
                            </Button>
                          </a>
                        )}
                        {isAuthenticated && user?.role === 'patient' ? (
                          <Link to={`/study/${nctId}`}>
                            <Button size="sm" className="bg-[#1033e5] text-white rounded-full whitespace-nowrap">
                              View Details
                            </Button>
                          </Link>
                        ) : (
                          <Link to={`/patients/connect${nctId ? `?nctId=${encodeURIComponent(nctId)}` : ''}`}>
                            <Button size="sm" className="bg-[#1033e5] text-white rounded-full whitespace-nowrap">
                              Check eligibility
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                    <Link to={`/study/${nctId}`} className="block">
                      {nearest && (
                        <div className="flex items-center gap-2 mb-3">
                          <MapPinIcon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{nearest}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {conditions.length > 0 && (
                          <Badge variant="secondary">{conditions.join(", ")}</Badge>
                        )}
                        {phases.length > 0 && (
                          <Badge variant="secondary">{phases.join(", ")}</Badge>
                        )}
                        {sponsor && <Badge variant="secondary">{sponsor}</Badge>}
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}

            {!error && (studies.length > 0 || data?.nextPageToken !== undefined || page > 1) && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (page > 1) {
                        const prev = page - 1;
                        setPage(prev);
                        setPageToken(tokenMapRef.current[prev] ?? "");
                      }
                    }}
                    disabled={page <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronDownIcon className="w-4 h-4 rotate-90" />
                  </Button>
                  {(() => {
                    const total = calcTotalPages();
                    const maxButtons = 5;
                    const start = Math.max(1, Math.min(page - Math.floor(maxButtons / 2), total - maxButtons + 1));
                    const end = Math.min(total, start + maxButtons - 1);
                    const buttons = [] as JSX.Element[];
                    for (let i = start; i <= end; i++) {
                      buttons.push(
                        <Button
                          key={i}
                          variant={i === page ? 'default' : 'outline'}
                          size="sm"
                          className={i === page ? 'bg-[#1033e5] text-white' : ''}
                          onClick={async () => {
                            if (i === page) return;
                            if (i === 1 || tokenMapRef.current[i] !== undefined) {
                              setPage(i);
                              setPageToken(tokenMapRef.current[i] ?? "");
                              return;
                            }
                            const aq = activeQuery || { qq: preparedQ, st: status, lc: preparedLoc };
                            let current = page;
                            let token = tokenMapRef.current[current] ?? "";
                            while (current < i) {
                              const r = await fetchStudies({ q: aq.qq, status: aq.st, type, loc: aq.lc, pageSize, pageToken: token });
                              token = r.nextPageToken || "";
                              if (r.nextPageToken) {
                                tokenMapRef.current[current + 1] = r.nextPageToken;
                              }
                              current += 1;
                              if (!r.nextPageToken) break;
                            }
                            setPage(i);
                            setPageToken(tokenMapRef.current[i] ?? "");
                          }}
                        >
                          {i}
                        </Button>
                      );
                    }
                    return buttons;
                  })()}
                  {(() => {
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nextToken = data?.nextPageToken;
                          if (nextToken) {
                            tokenMapRef.current[page + 1] = nextToken;
                            setPage(page + 1);
                            setPageToken(nextToken);
                          }
                        }}
                        disabled={!data?.nextPageToken}
                        aria-label="Next page"
                      >
                        <ChevronDownIcon className="w-4 h-4 -rotate-90" />
                      </Button>
                    );
                  })()}
                </div>
                <div className="text-xs text-gray-500">
                  {(() => {
                    const total = calcTotalPages();
                    return `Page ${page} of ${total}`;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="relative w-full bg-gray-50 mt-16">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-20">
          <div className="flex w-full items-start justify-between">
            <div className="flex flex-col w-[282px] items-start gap-4 relative">
              <img
                className="relative w-[124px] h-[39px]"
                alt="TrialCliniq Logo"
                src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2-1.png"
              />
              <p className="relative self-stretch text-gray-500 text-sm">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam et lacinia mi.
              </p>
              <img
                className="relative flex-[0_0_auto]"
                alt="Social media links"
                src="https://c.animaapp.com/mf3cenl8GIzqBa/img/socials.svg"
              />
            </div>
            <div className="inline-flex items-center gap-12 relative flex-[0_0_auto]">
              <div className="flex flex-col w-[180px] items-start gap-8 relative">
                <h4 className="text-gray-300">Solutions</h4>
                <div className="flex flex-col items-start gap-4 self-stretch w-full relative flex-[0_0_auto]">
                  {solutionsLinks.map((link, index) => (
                    <div key={index} className="relative w-[180px] h-7">
                      <div className="absolute w-[180px] h-7 -top-px left-0 text-[#414651]">
                        {link}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col w-[180px] items-start gap-8 relative">
                <h4 className="text-gray-300">Company</h4>
                <div className="flex flex-col items-start gap-4 self-stretch w-full relative flex-[0_0_auto]">
                  {companyLinks.map((link, index) => (
                    <div key={index} className="relative w-[180px] h-7">
                      <div className="absolute w-[180px] h-7 -top-px left-0 text-[#414651]">
                        {link}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Separator className="w-full max-w-[1200px] mx-auto" />
        <div className="flex w-full max-w-[1200px] mx-auto px-4 items-center justify-between py-4">
          <div className="text-[#717680] text-xs">Copyright © 2025 TrialCliniq.</div>
          <div className="inline-flex items-center justify-center gap-6 relative flex-[0_0_auto]">
            <div className="text-[#717680] text-xs">Website by Apperr</div>
          </div>
          <div className="inline-flex items-center justify-center gap-6 relative flex-[0_0_auto]">
            <div className="text-[#717680] text-xs">Back to top</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
