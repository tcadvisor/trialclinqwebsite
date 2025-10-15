import React from "react";
import { useParams, Link } from "react-router-dom";
import HomeHeader from "../components/HomeHeader";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Loader2, MapPinIcon, ArrowLeft } from "lucide-react";
import { fetchStudyByNctId, CtgovStudy, formatNearestSitePreview } from "../lib/ctgov";
import { Button } from "../components/ui/button";
import { readCurrentHealthProfile, computeStudyScore } from "../lib/matching";

function splitParagraphs(text: string): string[] {
  const t = String(text || "").replace(/\r/g, "").trim();
  if (!t) return [];
  const blocks = t.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length > 1) return blocks;
  return t.split(/(?<=[.!?])\s+(?=[A-Z(])/).map((s) => s.trim()).filter(Boolean);
}

function extractAgeRangeFromText(s: string): { min?: number; max?: number; maxExclusive?: boolean } | null {
  const text = (s || '').toLowerCase();
  let m = text.match(/(\d{1,3})\s*(?:to|–|-|—)\s*(?:less\s+than\s*)?(\d{1,3})\s*(?:years?|yrs?|yo)\b/);
  if (m) {
    const min = Number(m[1]);
    const max = Number(m[2]);
    const maxExclusive = /less\s+than\s*\d{1,3}\s*(?:years?|yrs?|yo)\b/.test(text.slice(m.index || 0, (m.index || 0) + m[0].length));
    return { min: Number.isFinite(min) ? min : undefined, max: Number.isFinite(max) ? max : undefined, maxExclusive };
  }
  m = text.match(/(\d{1,3})\s*(?:years?|yrs?|yo)\s*(?:and\s*older|and\s*over|or\s*older)\b/);
  if (m) { const min = Number(m[1]); return { min: Number.isFinite(min) ? min : undefined }; }
  m = text.match(/(?:under|less\s*than)\s*(\d{1,3})\s*(?:years?|yrs?|yo)\b/);
  if (m) { const max = Number(m[1]); return { max: Number.isFinite(max) ? max : undefined, maxExclusive: true }; }
  if (/\b(pediatric|child|children|infant|adolescent)s?\b/.test(text)) return { max: 17 };
  if (/\bolder\s+adult|elderly|senior\b/.test(text)) return { min: 65 };
  if (/\badult(s)?\b/.test(text) && !/\b(child|children|pediatric)\b/.test(text)) return { min: 18 };
  return null;
}

function parseEligibility(raw: string): { inclusion: string[]; exclusion: string[]; notes: string[] } {
  const bullets = (block: string): string[] => {
    const out: string[] = [];
    const lines = block.replace(/\r/g, '').split(/\n+/);
    let acc = '';
    const push = () => { const v = acc.trim(); if (v) out.push(v); acc = ''; };
    for (let line of lines) {
      const l = line.trim();
      if (!l) { if (acc) { push(); } continue; }
      const m = l.match(/^(?:[\*\-•–—]\s+|\d+[\.)]\s+)/);
      if (m) {
        if (acc) push();
        acc = l.slice(m[0].length).trim();
      } else {
        acc = acc ? acc + ' ' + l : l;
      }
    }
    if (acc) push();
    return out;
  };

  const t = String(raw || '').trim();
  if (!t) return { inclusion: [], exclusion: [], notes: [] };
  const idxInc = t.search(/inclusion\s+criteria/i);
  const idxExc = t.search(/exclusion\s+criteria/i);
  if (idxInc >= 0 && idxExc > idxInc) {
    const incBlock = t.slice(idxInc, idxExc).replace(/^[^\n]*\n?/, '');
    const excBlock = t.slice(idxExc).replace(/^[^\n]*\n?/, '');
    return { inclusion: bullets(incBlock), exclusion: bullets(excBlock), notes: [] };
  }
  if (idxExc >= 0 && (idxInc < 0 || idxExc < idxInc)) {
    const excBlock = t.slice(idxExc).replace(/^[^\n]*\n?/, '');
    return { inclusion: [], exclusion: bullets(excBlock), notes: [] };
  }
  return { inclusion: bullets(t), exclusion: [], notes: [] };
}

function ScoreRing({ value }: { value: number }) {
  const size = 84;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const off = c - (pct / 100) * c;
  const gid = React.useId();
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Match score ${pct}%`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2={String(size)} y2={String(size)} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={`url(#${gid})`} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={off} transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">{pct}%</text>
    </svg>
  );
}

export default function CtgovStudyDetails(): JSX.Element {
  const { nctId = "" } = useParams();
  const [study, setStudy] = React.useState<CtgovStudy | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");
  const [showAllInc, setShowAllInc] = React.useState(false);
  const [showAllExc, setShowAllExc] = React.useState(false);
  const [aiScore, setAiScore] = React.useState<number | null>(null);
  const [aiWhy, setAiWhy] = React.useState<string>("");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchStudyByNctId(nctId);
        if (!mounted) return;
        const s = res.studies?.[0] || null;
        setStudy(s);
      } catch (e: any) {
        if (!mounted) return;
        setError("Failed to load study details.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [nctId]);

  const title = study?.protocolSection?.identificationModule?.briefTitle || "";
  const overallStatus = study?.protocolSection?.statusModule?.overallStatus || "";
  const conditions = study?.protocolSection?.conditionsModule?.conditions || [];
  const phases = study?.protocolSection?.designModule?.phases || [];
  const sponsor = study?.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || "";
  const nearest = study ? formatNearestSitePreview(study) : "";

  React.useEffect(() => {
    // Compute baseline (dashboard) score immediately; then try AI rescoring
    let canceled = false;
    (async () => {
      try {
        if (!nctId || !study) { setAiScore(null); setAiWhy(""); return; }
        const profile = readCurrentHealthProfile();
        try { setAiScore(computeStudyScore(study, profile)); } catch {}
        try {
          const { scoreStudyWithAI } = await import('../lib/aiScoring');
          const res = await scoreStudyWithAI(nctId, profile);
          if (!canceled && res) { setAiScore(res.score); setAiWhy(res.rationale || ""); }
        } catch {
          // ignore if AI not configured
        }
      } catch {}
    })();
    return () => { canceled = true; };
  }, [nctId, study?.protocolSection?.identificationModule?.nctId]);

  const briefSummary = (study as any)?.protocolSection?.descriptionModule?.briefSummary || "";
  const eligibilityRaw = (study as any)?.protocolSection?.eligibilityModule?.eligibilityCriteria || "";
  const { inclusion, exclusion } = parseEligibility(eligibilityRaw);
  const ageHint = extractAgeRangeFromText(`${title}\n${eligibilityRaw}`);

  function buildEligibilitySuggestions(): string[] {
    const out: string[] = [];
    const p = readCurrentHealthProfile();
    const text = `${title}\n${eligibilityRaw}`.toLowerCase();
    const info = (p.additionalInfo || '').toLowerCase();

    if ((ageHint?.min != null || ageHint?.max != null) && (p.age == null || !Number.isFinite(p.age as any))) {
      const label = ageHint?.min != null && ageHint?.max != null ? `${ageHint.min}–${ageHint.max} yrs` : ageHint?.min != null ? `${ageHint.min}+ yrs` : `< ${ageHint?.max} yrs`;
      out.push(`Add your age or DOB (trial targets ${label}).`);
    }

    const genderRestr = (() => {
      const t = text;
      if (/(female|women)\s*-?\s*only\b/.test(t) || /\bfemales?\s+only\b/.test(t)) return 'female';
      if (/(male|men)\s*-?\s*only\b/.test(t) || /\bmales?\s+only\b/.test(t)) return 'male';
      return null;
    })();
    if (genderRestr && !(p.gender || '').trim()) {
      out.push('Add your gender (this study limits enrollment by gender).');
    }

    if (/(planned|schedule[rd]).{0,30}(elective\s+)?(hepato|hepatobiliary|hepato[-\s]?pancreato[-\s]?biliary|pancreatic|colorectal)/i.test(text)) {
      const hasSignal = /(planned surgery|elective surgery|hepato|hepatobiliary|pancreat|colorectal|colectomy|whipple|hepatectomy)/i.test(info);
      if (!hasSignal) out.push('Confirm a planned elective HPB/colorectal surgery (add in Additional Info).');
    }

    if (/\bECOG\b/i.test(eligibilityRaw) && !/ecog\s*:\s*\d/i.test(p.additionalInfo || '')) {
      out.push('Add your ECOG performance status.');
    }

    if (/(biomarker|mutation|egfr|brca|pd-?l1|her2)/i.test(eligibilityRaw) && !/(biomarker|egfr|brca|pd-?l1|her2)/i.test(p.additionalInfo || '')) {
      out.push('Add key biomarkers relevant to your condition.');
    }

    if (/(creatinine|egfr|bilirubin|alt|ast)/i.test(eligibilityRaw)) {
      out.push('Provide recent lab values (e.g., creatinine, liver function) if available.');
    }

    if (/(tamsulosin|pde5|sildenafil|tadalafil|vardenafil|avanafil)/i.test(eligibilityRaw) && (!Array.isArray(p.medications) || p.medications.length === 0)) {
      out.push('List your current medications to verify drug restrictions.');
    }

    return Array.from(new Set(out));
  }

  const suggestions = buildEligibilitySuggestions();

  const incMax = showAllInc ? inclusion.length : Math.min(10, inclusion.length);
  const excMax = showAllExc ? exclusion.length : Math.min(10, exclusion.length);

  return (
    <div className="flex flex-col w-full items-center relative bg-white">
      <HomeHeader />
      <main className="w-full max-w-[1000px] px-4 py-8">
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
          <Link to="/patients/dashboard" className="inline-flex items-center gap-1 text-blue-700 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
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

        {!loading && !error && !study && (
          <div className="p-6 border rounded-md text-gray-600">Study not found or unavailable right now.</div>
        )}

        {!loading && !error && study && (
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-semibold mb-3 leading-snug flex-1">{title}</h1>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <ScoreRing value={aiScore ?? 0} />
                    <div className="mt-1 text-xs text-gray-700">Match score</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {overallStatus && <Badge variant="secondary">{overallStatus}</Badge>}
                {phases.length > 0 && <Badge variant="secondary">{phases.join(", ")}</Badge>}
                {sponsor && <Badge variant="secondary">{sponsor}</Badge>}
                {nctId && <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">{nctId}</Badge>}
                {ageHint && (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    {ageHint.min != null && ageHint.max != null
                      ? `${ageHint.min}–${ageHint.max}${ageHint.maxExclusive ? ' (max excl.)' : ''} yrs`
                      : ageHint.min != null
                        ? `${ageHint.min}+ yrs`
                        : ageHint.max != null
                          ? `< ${ageHint.max} yrs`
                          : ''}
                  </Badge>
                )}
              </div>
              {nearest && (
                <div className="flex items-center gap-2 mt-3 text-gray-700">
                  <MapPinIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{nearest}</span>
                </div>
              )}
              {aiWhy && (
                <div className="mt-2 text-xs text-gray-500">Why: {aiWhy}</div>
              )}
              {conditions && conditions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {conditions.slice(0, 6).map((c) => (
                    <Badge key={c} className="bg-blue-50 text-blue-700 hover:bg-blue-50">{c}</Badge>
                  ))}
                </div>
              )}
            </div>

            <Card>
              <CardContent className="p-6 space-y-3">
                <h2 className="text-lg font-semibold">Overview</h2>
                <Separator />
                <div className="text-sm text-gray-700 space-y-3">
                  {splitParagraphs(briefSummary).length > 0
                    ? splitParagraphs(briefSummary).map((p, i) => (<p key={i}>{p}</p>))
                    : <p>No summary available.</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Eligibility</h2>
                <Separator />
                {(inclusion.length === 0 && exclusion.length === 0) ? (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{eligibilityRaw || "Refer to sponsor for details."}</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Inclusion Criteria</h3>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                        {inclusion.slice(0, incMax).map((item, i) => (<li key={i}>{item}</li>))}
                      </ul>
                      {inclusion.length > 10 && (
                        <button className="mt-2 text-xs text-blue-700 hover:underline" onClick={() => setShowAllInc((v) => !v)}>
                          {showAllInc ? 'Show less' : `Show all (${inclusion.length})`}
                        </button>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Exclusion Criteria</h3>
                      {exclusion.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                          {exclusion.slice(0, excMax).map((item, i) => (<li key={i}>{item}</li>))}
                        </ul>
                      ) : (
                        <div className="text-sm text-gray-700">Not specified.</div>
                      )}
                      {exclusion.length > 10 && (
                        <button className="mt-2 text-xs text-blue-700 hover:underline" onClick={() => setShowAllExc((v) => !v)}>
                          {showAllExc ? 'Show less' : `Show all (${exclusion.length})`}
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
