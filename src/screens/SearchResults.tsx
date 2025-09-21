import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { ChevronDownIcon, MapPinIcon, Loader2 } from "lucide-react";
import HomeHeader from "../components/HomeHeader";
import {
  CtgovResponse,
  CtgovStudy,
  fetchStudies,
  formatNearestSitePreview,
  ctgovStudyDetailUrl,
} from "../lib/ctgov";

const solutionsLinks = ["Find a study", "More about trials", "How TrialCliniq help", "Blog"];
const companyLinks = ["Terms of Conditions", "Contact Us", "About Us", "Privacy Policy"];

export const SearchResults = (): JSX.Element => {
  const { search } = useLocation();

  const params = React.useMemo(() => new URLSearchParams(search), [search]);
  const initialQ = params.get("q")?.trim() || "breast cancer";

  const [q, setQ] = React.useState<string>(initialQ);
  const [status, setStatus] = React.useState<string>("");
  const [type, setType] = React.useState<string>("");
  const [pageSize, setPageSize] = React.useState<number>(12);
  const [pageToken, setPageToken] = React.useState<string>("");
  const [prevTokens, setPrevTokens] = React.useState<string[]>([]);

  const [data, setData] = React.useState<CtgovResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError("");
    fetchStudies({ q, status, type, pageSize, pageToken }, ac.signal)
      .then((res) => setData(res))
      .catch((e) => {
        if (e.name !== "AbortError") setError("Failed to load studies. Please try again.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [q, status, type, pageSize, pageToken]);

  const studies = data?.studies ?? [];

  return (
    <div className="flex flex-col w-full items-center relative bg-white">
      <HomeHeader />
      <main className="w-full max-w-[1200px] px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-500">Home</span>
          <span className="text-sm text-gray-500">&gt;</span>
          <span className="text-sm text-gray-500">Search results</span>
        </div>

        <h1 className="text-2xl font-semibold mb-6">Clinical trials</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 space-y-6">
                <h3 className="font-semibold">Refine Your Results</h3>
                <div>
                  <h4 className="font-medium mb-2">Condition</h4>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => {
                      setPrevTokens([]);
                      setPageToken("");
                      setQ(e.target.value);
                    }}
                    placeholder="e.g. breast cancer"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Status</h4>
                  <Select
                    value={status || "any"}
                    onValueChange={(v) => {
                      const next = v === "any" ? "" : v;
                      setPrevTokens([]);
                      setPageToken("");
                      setStatus(next);
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
                    value={type || "any"}
                    onValueChange={(v) => {
                      const next = v === "any" ? "" : v;
                      setPrevTokens([]);
                      setPageToken("");
                      setType(next);
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
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      const size = parseInt(v, 10);
                      setPrevTokens([]);
                      setPageToken("");
                      setPageSize(size);
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
              const detailUrl = ctgovStudyDetailUrl(study);
              const nctId = study.protocolSection?.identificationModule?.nctId || "";

              return (
                <Card key={`${nctId}-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <a href={detailUrl} target="_blank" rel="noreferrer" className="hover:underline flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-[#1033e5] mb-1 break-words leading-snug">{title}</h3>
                      </a>
                      <div className="flex items-center gap-2">
                        {overallStatus && <Badge variant="secondary">{overallStatus}</Badge>}
                        <a href={detailUrl} target="_blank" rel="noreferrer">
                          <Button size="sm" className="bg-gray-900 text-white rounded-full whitespace-nowrap">
                            View on ClinicalTrials.gov
                          </Button>
                        </a>
                      </div>
                    </div>
                    <a href={detailUrl} target="_blank" rel="noreferrer" className="block">
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
                    </a>
                  </CardContent>
                </Card>
              );
            })}

            {!loading && !error && (
              <div className="flex items-center gap-3">
                {data?.nextPageToken && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPrevTokens((prev) => [...prev, pageToken]);
                      setPageToken(data?.nextPageToken || "");
                    }}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronDownIcon className="w-4 h-4 -rotate-90 ml-1" />
                  </Button>
                )}
                {prevTokens.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextPrev = [...prevTokens];
                      const last = nextPrev.pop() || "";
                      setPrevTokens(nextPrev);
                      setPageToken(last);
                    }}
                    aria-label="Previous page"
                  >
                    <ChevronDownIcon className="w-4 h-4 rotate-90 mr-1" />
                    Previous
                  </Button>
                )}
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
