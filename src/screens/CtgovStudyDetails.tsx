import React from "react";
import { useParams, Link } from "react-router-dom";
import HomeHeader from "../components/HomeHeader";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Loader2, MapPinIcon, ArrowLeft } from "lucide-react";
import { fetchStudyByNctId, CtgovStudy, formatNearestSitePreview } from "../lib/ctgov";
import { Button } from "../components/ui/button";

export default function CtgovStudyDetails(): JSX.Element {
  const { nctId = "" } = useParams();
  const [study, setStudy] = React.useState<CtgovStudy | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError("");
    fetchStudyByNctId(nctId, ac.signal)
      .then((res) => {
        const s = res.studies?.[0] || null;
        setStudy(s);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError("Failed to load study details.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [nctId]);

  const title = study?.protocolSection?.identificationModule?.briefTitle || "";
  const overallStatus = study?.protocolSection?.statusModule?.overallStatus || "";
  const conditions = study?.protocolSection?.conditionsModule?.conditions || [];
  const phases = study?.protocolSection?.designModule?.phases || [];
  const sponsor = study?.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || "";
  const nearest = study ? formatNearestSitePreview(study) : "";

  return (
    <div className="flex flex-col w-full items-center relative bg-white">
      <HomeHeader />
      <main className="w-full max-w-[1000px] px-4 py-8">
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
          <Link to="/search-results" className="inline-flex items-center gap-1 text-blue-700 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to results
          </Link>
        </div>

        {loading && (
          <div className="p-6 text-center text-gray-600 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading study…
          </div>
        )}

        {!loading && error && (
          <div className="p-6 border border-red-200 bg-red-50 text-red-800 rounded-md">{error}</div>
        )}

        {!loading && !error && study && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold mb-2">{title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                {overallStatus && <Badge variant="secondary">{overallStatus}</Badge>}
                {phases.length > 0 && <Badge variant="secondary">{phases.join(", ")}</Badge>}
                {sponsor && <Badge variant="secondary">{sponsor}</Badge>}
              </div>
              {nearest && (
                <div className="flex items-center gap-2 mt-3 text-gray-700">
                  <MapPinIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{nearest}</span>
                </div>
              )}
            </div>

            <Card>
              <CardContent className="p-6 space-y-3">
                <h2 className="text-lg font-semibold">Overview</h2>
                <Separator />
                <div className="text-sm text-gray-700">
                  {/* Brief summary if present */}
                  {/* We requested descriptionModule.briefSummary in fields; render if available via optional chaining */}
                  {(study as any)?.protocolSection?.descriptionModule?.briefSummary || "No summary available."}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-3">
                <h2 className="text-lg font-semibold">Eligibility</h2>
                <Separator />
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {(study as any)?.protocolSection?.eligibilityModule?.eligibilityCriteria || "Refer to sponsor for details."}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button asChild className="bg-gray-900 text-white rounded-full">
                <a href={`https://clinicaltrials.gov/study/${nctId}`} target="_blank" rel="noreferrer">View on ClinicalTrials.gov</a>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
