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
import { getSpellCheckSuggestions, correctWithAI, type SpellCheckSuggestion } from "../lib/spellCheck";
import { formatStudyStatus, formatStudyType, formatPhase } from "../lib/formatters";
import { geocodeText } from "../lib/geocode";
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

const US_STATES = new Set<string>([
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia",
  "hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts",
  "michigan","minnesota","mississippi","missouri","montana","nebraska","nevada","new hampshire","new jersey","new mexico",
  "new york","north carolina","north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island","south carolina",
  "south dakota","tennessee","texas","utah","vermont","virginia","washington","west virginia","wisconsin","wyoming",
  "district of columbia","washington dc","washington d.c."
]);

const US_STATE_MAP: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA", "colorado": "CO",
  "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
  "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA",
  "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
  "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA",
  "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX",
  "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
  "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC", "washington dc": "DC", "washington d.c.": "DC",
};

const US_STATE_ABBRS = new Set<string>([
  "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia","ks","ky","la","me","md","ma","mi",
  "mn","ms","mo","mt","ne","nv","nh","nj","nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut",
  "vt","va","wa","wv","wi","wy","dc"
]);

const LOCATION_ONLY_RE = /^\s*(\d{5}(-\d{4})?|[a-z\s]+,\s*[a-z]{2})\s*$/i;

function looksLikeLocationOnly(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (LOCATION_ONLY_RE.test(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  if (lower === "usa" || lower === "us" || lower === "united states") return true;
  if (US_STATES.has(lower)) return true;
  if (US_STATE_ABBRS.has(lower)) return true;
  return false;
}

function inferQueryAndLocation(rawQuery: string, rawLoc: string): { query: string; loc: string } {
  const q = (rawQuery || "").trim();
  const loc = (rawLoc || "").trim();
  if (!q || loc) return { query: q, loc };

  const nearMatch = q.match(/\b(?:in|near|around|within)\s+(.+)$/i);
  if (nearMatch?.[1]) {
    const inferredLoc = nearMatch[1].trim();
    const cleanedQuery = q.replace(/\b(?:in|near|around|within)\s+(.+)$/i, "").trim();
    if (inferredLoc) return { query: cleanedQuery, loc: inferredLoc };
  }

  const commaParts = q.split(",").map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const tail = commaParts[commaParts.length - 1].toLowerCase();
    if (US_STATE_ABBRS.has(tail) || US_STATES.has(tail)) {
      const head = commaParts.slice(0, -1).join(", ").trim();
      if (looksLikeLocationOnly(head)) {
        return { query: "", loc: `${head}, ${commaParts[commaParts.length - 1]}`.trim() };
      }
      return { query: head, loc: commaParts.slice(-1).join(", ") };
    }
  }

  if (looksLikeLocationOnly(q)) {
    return { query: "", loc: q };
  }

  return { query: q, loc };
}

function normalizePart(input?: string): string {
  return (input || "").trim().toLowerCase().replace(/\./g, "");
}

function toStateAbbr(input?: string): string | undefined {
  const norm = normalizePart(input);
  if (!norm) return undefined;
  if (US_STATE_ABBRS.has(norm)) return norm.toUpperCase();
  if (US_STATE_MAP[norm]) return US_STATE_MAP[norm];
  return undefined;
}

function parsePreferredLocation(loc: string): { city?: string; state?: string; country?: string } {
  if (!loc) return {};
  const rawParts = loc.split(",").map((p) => p.trim()).filter(Boolean);
  if (!rawParts.length) return {};
  const parts = [...rawParts];
  const last = normalizePart(parts[parts.length - 1]);
  if (last === "united states" || last === "usa" || last === "us") {
    const country = parts.pop();
    const state = parts.length ? parts.pop() : undefined;
    const city = parts.length ? parts.join(", ") : undefined;
    return { city, state, country };
  }
  if (parts.length >= 2) {
    const state = parts.pop();
    const city = parts.join(", ");
    return { city, state };
  }
  const single = parts[0];
  const singleNorm = normalizePart(single);
  if (US_STATES.has(singleNorm) || US_STATE_ABBRS.has(singleNorm)) {
    return { state: single };
  }
  return { city: single };
}

function tokenizeQuery(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function filterStudiesByQuery(studies: CtgovStudy[], rawQuery: string): CtgovStudy[] {
  const tokens = tokenizeQuery(rawQuery);
  if (!tokens.length) return studies;
  return studies.filter((s) => {
    const title = (s.protocolSection?.identificationModule?.briefTitle || "").toString().toLowerCase();
    const conditions = (s.protocolSection?.conditionsModule?.conditions || []).join(" ").toLowerCase();
    const hay = `${title} ${conditions}`;
    return tokens.every((t) => hay.includes(t));
  });
}

function isCityMatch(a?: string, b?: string): boolean {
  const na = normalizePart(a);
  const nb = normalizePart(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function formatPreferredSitePreview(study: CtgovStudy, preferredLoc?: string): string {
  const locs = study.protocolSection?.contactsLocationsModule?.locations || [];
  if (!locs.length) return "";
  if (!preferredLoc) return formatNearestSitePreview(study);

  const pref = parsePreferredLocation(preferredLoc);
  const prefState = toStateAbbr(pref.state);
  const prefCity = pref.city;
  const prefCountry = normalizePart(pref.country);

  let best = locs[0];
  let bestScore = -1;

  for (const loc of locs) {
    const city = loc.city || "";
    const state = loc.state || "";
    const country = loc.country || "";
    const stateAbbr = toStateAbbr(state) || state.toUpperCase();
    let score = 0;
    if (prefState && stateAbbr === prefState) score += 3;
    if (prefCity && isCityMatch(prefCity, city)) score += 4;
    if (prefCountry && normalizePart(country) === prefCountry) score += 1;
    if (score > bestScore) {
      best = loc;
      bestScore = score;
    }
  }

  const parts = [best.city, best.state, best.country].filter(Boolean);
  return parts.join(", ");
}

export const SearchResults = (): JSX.Element => {
  const { search } = useLocation();
  const navigate = useNavigate();

  const params = React.useMemo(() => new URLSearchParams(search), [search]);
  const initialQ = params.get("q")?.trim() || "";
  const initialLoc = params.get("loc")?.trim() || "";
  const initialStatus = (params.get("status")?.trim().toUpperCase() || "RECRUITING");
  const initialType = params.get("type")?.trim() || "";
  const initialPageSize = parseInt(params.get("pageSize") || "12", 10);
  const initialRadius = params.get("radius")?.trim() || "";

  const [q, setQ] = React.useState<string>(initialQ);
  const [loc, setLoc] = React.useState<string>(initialLoc);
  const [tempQ, setTempQ] = React.useState<string>(initialQ);
  const [tempLoc, setTempLoc] = React.useState<string>(initialLoc);
  const [tempStatus, setTempStatus] = React.useState<string>(initialStatus);
  const [tempType, setTempType] = React.useState<string>(initialType);
  const [tempPageSize, setTempPageSize] = React.useState<number>(initialPageSize);
  const [tempRadius, setTempRadius] = React.useState<string>(initialRadius);
  const inferred = React.useMemo(() => inferQueryAndLocation(q, loc), [q, loc]);
  const preparedQ = React.useMemo(() => buildSmartCondQuery(inferred.query), [inferred.query]);
  const preparedLoc = React.useMemo(() => normalizeLocation(inferred.loc), [inferred.loc]);
  const [status, setStatus] = React.useState<string>(initialStatus);
  const [type, setType] = React.useState<string>(initialType);
  const [pageSize, setPageSize] = React.useState<number>(initialPageSize);
  const [radius, setRadius] = React.useState<string>(initialRadius);
  const [radiusTouched, setRadiusTouched] = React.useState<boolean>(Boolean(initialRadius));
  const [page, setPage] = React.useState<number>(1);
  const [pageToken, setPageToken] = React.useState<string>("");
  const tokenMapRef = React.useRef<Record<number, string>>({ 1: "" });
  const [activeQuery, setActiveQuery] = React.useState<{ qq: string; st?: string; lc?: string } | null>(null);
  const [geo, setGeo] = React.useState<{ lat?: number; lng?: number; label?: string } | null>(null);
  const [geoLoading, setGeoLoading] = React.useState<boolean>(false);
  const [geoError, setGeoError] = React.useState<string>("");

  const [data, setData] = React.useState<CtgovResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");
  const [spellSuggestions, setSpellSuggestions] = React.useState<SpellCheckSuggestion[]>([]);
  const [aiSuggestion, setAiSuggestion] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);

  const handleApplyFilters = () => {
    const queryParams = new URLSearchParams();
    if (tempQ) queryParams.set("q", tempQ);
    if (tempLoc) queryParams.set("loc", tempLoc);
    if (tempStatus) queryParams.set("status", tempStatus);
    if (tempType) queryParams.set("type", tempType);
    if (tempRadius) queryParams.set("radius", tempRadius);
    queryParams.set("pageSize", String(tempPageSize));
    navigate(`/patients/find-trial?${queryParams.toString()}`);
    setQ(tempQ);
    setLoc(tempLoc);
    setStatus(tempStatus);
    setType(tempType);
    setRadius(tempRadius);
    setPageSize(tempPageSize);
    setPage(1);
  };

  React.useEffect(() => {
    let mounted = true;
    const nextLoc = preparedLoc;
    if (!nextLoc) {
      setGeo(null);
      setGeoError("");
      setGeoLoading(false);
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    (async () => {
      try {
        const g = await geocodeText(nextLoc);
        if (!mounted) return;
        if (typeof g?.lat === "number" && typeof g?.lng === "number") {
          setGeo(g);
          setGeoError("");
        } else {
          setGeo(null);
          setGeoError("We couldn't pinpoint that location. Results may be broader than expected.");
        }
      } catch {
        if (!mounted) return;
        setGeo(null);
        setGeoError("We couldn't pinpoint that location. Results may be broader than expected.");
      } finally {
        if (mounted) setGeoLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [preparedLoc]);

  React.useEffect(() => {
    if (preparedLoc && !radius && !radiusTouched) {
      setRadius("50mi");
      setTempRadius("50mi");
    }
  }, [preparedLoc, radius, radiusTouched]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (preparedLoc && geoLoading) {
        setLoading(true);
        setError("");
        return;
      }
      if (!q.trim() && !preparedLoc) {
        setError("");
        setData({ studies: [], totalCount: 0 });
        setLoading(false);
        return;
      }
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
          const effectiveQuery = inferred.query.trim();
          const loose = buildLooseCondQuery(effectiveQuery);
          const attempts: Array<{ qq: string; st?: string; lc?: string }> = [];
          const normalizedQ = effectiveQuery;
          const queryVariants = [preparedQ, loose, normalizedQ]
            .map((v) => (v || "").trim())
            .filter((v, i, arr) => v && arr.indexOf(v) === i);

          const baseStatus = status || "";
          const baseLoc = preparedLoc || "";
          const effectiveRadius = radius || "";
          const geoReady = Boolean(baseLoc && effectiveRadius && geo?.lat && geo?.lng);
          const locationFirst = Boolean(baseLoc && effectiveQuery);

          for (const variant of queryVariants) {
            attempts.push({ qq: variant, st: baseStatus, lc: baseLoc });
          }

          if (attempts.length === 0) {
            attempts.push({ qq: normalizedQ, st: baseStatus, lc: baseLoc });
          }

          if (locationFirst) {
            const r = await fetchStudies({
              q: "",
              status: baseStatus,
              type,
              loc: geoReady ? "" : baseLoc,
              lat: geoReady ? geo?.lat : undefined,
              lng: geoReady ? geo?.lng : undefined,
              radius: geoReady ? effectiveRadius : undefined,
              pageSize,
              pageToken: "",
            });
            const filtered = filterStudiesByQuery(r.studies || [], effectiveQuery);
            res = { ...r, studies: filtered, totalCount: filtered.length, nextPageToken: undefined };
            used = { qq: effectiveQuery, st: baseStatus, lc: baseLoc };
            setPage(1);
            setPageToken("");
          } else if (page > 1 || pageToken) {
            const a = activeQuery || attempts[0];
            used = a;
            res = await fetchStudies({
              q: a.qq,
              status: a.st,
              type,
              loc: geoReady ? "" : a.lc,
              lat: geoReady ? geo?.lat : undefined,
              lng: geoReady ? geo?.lng : undefined,
              radius: geoReady ? effectiveRadius : undefined,
              pageSize,
              pageToken,
            });
          } else {
            for (const a of attempts) {
              const r = await fetchStudies({
                q: a.qq,
                status: a.st,
                type,
                loc: geoReady ? "" : a.lc,
                lat: geoReady ? geo?.lat : undefined,
                lng: geoReady ? geo?.lng : undefined,
                radius: geoReady ? effectiveRadius : undefined,
                pageSize,
                pageToken: "",
              });
              res = r;
              used = a;
              if ((r.studies || []).length > 0 || r.nextPageToken !== undefined) break;
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
  }, [q, preparedQ, preparedLoc, status, type, pageSize, pageToken, page, geo?.lat, geo?.lng, geoError, radius]);

  React.useEffect(() => {
    tokenMapRef.current = { 1: "" };
    setActiveQuery(null);
    setPage(1);
    setPageToken("");
  }, [preparedQ, preparedLoc, status, type, pageSize, radius]);

  // Compute spell check suggestions when results are empty
  React.useEffect(() => {
    if (data && data.studies && data.studies.length === 0 && !loading && q) {
      const suggestions = getSpellCheckSuggestions(q);
      setSpellSuggestions(suggestions);
    } else {
      setSpellSuggestions([]);
      setAiSuggestion(null);
    }
  }, [data?.studies?.length, loading, q]);

  const handleAiCorrection = async () => {
    if (!q || aiLoading) return;
    setAiLoading(true);
    try {
      const corrected = await correctWithAI(q);
      if (corrected) {
        setAiSuggestion(corrected);
      }
    } catch {
      // silently fail
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setTempQ(suggestion);
    setQ(suggestion);
    setPage(1);
  };

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
        {inferred.loc && !loc.trim() && (
          <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            We treated "{inferred.loc}" as your location. Update the location filter if you meant it as a condition.
          </div>
        )}
        {geoError && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {geoError}
          </div>
        )}

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
                    placeholder="City, State"
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
                    {tempStatus && <div className="hidden">{formatStudyStatus(tempStatus)}</div>}
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="RECRUITING">{formatStudyStatus('RECRUITING')}</SelectItem>
                      <SelectItem value="ACTIVE_NOT_RECRUITING">{formatStudyStatus('ACTIVE_NOT_RECRUITING')}</SelectItem>
                      <SelectItem value="COMPLETED">{formatStudyStatus('COMPLETED')}</SelectItem>
                      <SelectItem value="NOT_YET_RECRUITING">{formatStudyStatus('NOT_YET_RECRUITING')}</SelectItem>
                      <SelectItem value="ENROLLING_BY_INVITATION">{formatStudyStatus('ENROLLING_BY_INVITATION')}</SelectItem>
                      <SelectItem value="SUSPENDED">{formatStudyStatus('SUSPENDED')}</SelectItem>
                      <SelectItem value="TERMINATED">{formatStudyStatus('TERMINATED')}</SelectItem>
                      <SelectItem value="WITHDRAWN">{formatStudyStatus('WITHDRAWN')}</SelectItem>
                      <SelectItem value="UNKNOWN">{formatStudyStatus('UNKNOWN')}</SelectItem>
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
                    {tempType && <div className="hidden">{formatStudyType(tempType)}</div>}
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="INTERVENTIONAL">{formatStudyType('INTERVENTIONAL')}</SelectItem>
                      <SelectItem value="OBSERVATIONAL">{formatStudyType('OBSERVATIONAL')}</SelectItem>
                      <SelectItem value="EXPANDED_ACCESS">{formatStudyType('EXPANDED_ACCESS')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Distance from location</h4>
                  <Select
                    value={tempRadius || "any"}
                    onValueChange={(v) => {
                      const next = v === "any" ? "" : v;
                      setTempRadius(next);
                      setRadiusTouched(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any distance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any distance</SelectItem>
                      <SelectItem value="10mi">10 miles</SelectItem>
                      <SelectItem value="25mi">25 miles</SelectItem>
                      <SelectItem value="50mi">50 miles</SelectItem>
                      <SelectItem value="100mi">100 miles</SelectItem>
                      <SelectItem value="200mi">200 miles</SelectItem>
                    </SelectContent>
                  </Select>
                  {geoLoading && (
                    <div className="mt-2 text-xs text-gray-500">Finding that location...</div>
                  )}
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
                      <SelectItem value="12">12 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
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
              <div className="p-6 border rounded-md">
                <div className="text-gray-700 font-medium mb-4">No studies found. Try changing your filters.</div>

                {spellSuggestions.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-gray-700 mb-3">Did you mean:</p>
                    <div className="flex flex-wrap gap-2">
                      {spellSuggestions.map((sugg, i) => (
                        <button
                          key={i}
                          onClick={() => applySuggestion(sugg.suggestion)}
                          className="px-3 py-2 rounded-md bg-white border border-blue-300 text-blue-700 text-sm hover:bg-blue-100 transition-colors"
                          title={`Confidence: ${sugg.confidence}`}
                        >
                          {sugg.suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!aiSuggestion && spellSuggestions.length === 0 && (
                  <div className="mt-4">
                    <button
                      onClick={handleAiCorrection}
                      disabled={aiLoading}
                      className="px-4 py-2 rounded-md bg-purple-600 text-white text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {aiLoading ? 'Checking with AI...' : 'Try AI Spell Check'}
                    </button>
                  </div>
                )}

                {aiSuggestion && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
                    <p className="text-sm text-gray-700 mb-2">AI suggests:</p>
                    <button
                      onClick={() => applySuggestion(aiSuggestion)}
                      className="px-3 py-2 rounded-md bg-white border border-purple-300 text-purple-700 text-sm hover:bg-purple-100 transition-colors"
                    >
                      {aiSuggestion}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!loading && !error && studies.map((study: CtgovStudy, index: number) => {
              const title = study.protocolSection?.identificationModule?.briefTitle || "Untitled";
              const overallStatus = study.protocolSection?.statusModule?.overallStatus || "";
              const conditions = study.protocolSection?.conditionsModule?.conditions || [];
              const phases = study.protocolSection?.designModule?.phases || [];
              const sponsor = study.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || "";
              const nearest = formatPreferredSitePreview(study, geo?.label || preparedLoc);
              const nctId = study.protocolSection?.identificationModule?.nctId || "";

              return (
                <Card key={`${nctId}-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <Link to={`/study/${nctId}`} className="hover:underline flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-[#1033e5] mb-1 break-words leading-snug">{title}</h3>
                      </Link>
                      <div className="flex items-center gap-2">
                        {overallStatus && <Badge variant="secondary">{formatStudyStatus(overallStatus)}</Badge>}
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
                          <Badge variant="secondary">{phases.map(p => formatPhase(p)).join(", ")}</Badge>
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
                            const geoReady = Boolean(preparedLoc && radius && geo?.lat && geo?.lng);
                            let current = page;
                            let token = tokenMapRef.current[current] ?? "";
                            while (current < i) {
                              const r = await fetchStudies({
                                q: aq.qq,
                                status: aq.st,
                                type,
                                loc: geoReady ? "" : aq.lc,
                                lat: geoReady ? geo?.lat : undefined,
                                lng: geoReady ? geo?.lng : undefined,
                                radius: geoReady ? radius : undefined,
                                pageSize,
                                pageToken: token,
                              });
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
