import { trials as staticTrials, type Trial } from "./trials";
import { computeProfileCompletion } from "./profile";
import { fetchStudies, type CtgovStudy } from "./ctgov";
import { geocodeLocPref } from "./geocode";

export type MinimalProfile = {
  age?: number | null;
  gender?: string | null;
  primaryCondition?: string | null;
  medications?: string[];
  allergies?: string[];
  additionalInfo?: string | null;
};

export type LiteTrial = {
  slug: string;
  nctId: string;
  title: string;
  status: string;
  phase: string;
  aiScore: number;
  interventions: string[];
  center: string;
  location: string;
  reason?: string;
  aiRationale?: string;
};

const PROFILE_KEY = "tc_health_profile_v1";
const ELIGIBILITY_KEY = "tc_eligibility_profile";

function parseAgeFromEligibility(): number | null {
  try {
    const raw = localStorage.getItem(ELIGIBILITY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Record<string, string>>;
    const dob = (data["dob"] as string) || "";
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  } catch {
    return null;
  }
}

function readLocationPref(): { loc: string; radius?: string } {
  try {
    const raw = localStorage.getItem(ELIGIBILITY_KEY);
    if (!raw) return { loc: "" };
    const data = JSON.parse(raw) as Partial<Record<string, string>>;
    const loc = String(data["loc"] || "").trim();
    const radius = String(data["radius"] || "").trim() || undefined;
    return { loc, radius };
  } catch {
    return { loc: "" };
  }
}

export function readCurrentHealthProfile(): MinimalProfile {
  let age: number | null = null;
  let gender: string | null = null;
  let primaryCondition: string | null = null;
  let medications: string[] = [];
  let allergies: string[] = [];
  let additionalInfo: string | null = null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as any;
      const a = Number(p?.age);
      age = Number.isFinite(a) ? a : null;
      gender = (p?.gender ? String(p.gender) : "").trim() || null;
      primaryCondition = (p?.primaryCondition ? String(p.primaryCondition) : "").trim() || null;
      if (Array.isArray(p?.medications)) medications = p.medications.map((m: any) => String(m?.name || "").toLowerCase()).filter(Boolean);
      if (Array.isArray(p?.allergies)) allergies = p.allergies.map((m: any) => String(m?.name || "").toLowerCase()).filter(Boolean);
      additionalInfo = (p?.additionalInfo ? String(p.additionalInfo) : "").trim() || null;
    }
  } catch {}
  if (age == null) {
    // Try DOB-based calc
    age = parseAgeFromEligibility();
    if (age == null) {
      // Fallback: explicit age provided during signup personal details
      try {
        const raw = localStorage.getItem(ELIGIBILITY_KEY);
        if (raw) {
          const data = JSON.parse(raw) as Partial<Record<string, string>>;
          const v = Number(data["age"]);
          if (Number.isFinite(v)) age = v;
        }
      } catch {}
    }
  }
  return { age, gender, primaryCondition, medications, allergies, additionalInfo };
}

const STOPWORDS = new Set([
  "the","a","an","and","or","of","for","to","in","on","with","without","by","at","from","about","into","over","after","before","is","are","be","being","been","this","that","these","those","study","trial","clinical","investigating","investigation","impact","patients","patient","therapy","treatment"
]);

function tokenize(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

function textFromTrial(t: Trial): string {
  const parts: string[] = [
    t.title,
    t.description.join(". "),
    t.purpose.join(". "),
    t.benefits.join(". "),
    t.criteria.inclusion.join(". "),
    t.criteria.exclusion.join(". "),
    t.interventions.join(". "),
    t.center,
    t.location,
  ];
  return parts.filter(Boolean).join(". ");
}

function intersectCount(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sb = new Set(b);
  let c = 0;
  for (const x of a) if (sb.has(x)) c++;
  return c;
}

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

export type ScoreBreakdown = {
  base: number;
  condition: number;
  age: number;
  gender: number;
  meds: number;
  allergies: number;
  completenessBoost: number;
};

export function computeTrialMatchScore(trial: Trial, profile: MinimalProfile): { score: number; breakdown: ScoreBreakdown } {
  const trialTextTokens = tokenize(textFromTrial(trial));
  const condTokens = tokenize(profile.primaryCondition || "");
  const addlTokens = tokenize(profile.additionalInfo || "");

  // Base favors recruiting over non-recruiting
  const base = trial.status === "Now Recruiting" ? 20 : trial.status === "Active" ? 12 : 5;

  // Condition/title similarity
  const condOverlap = intersectCount(condTokens, trialTextTokens);
  const addlOverlap = intersectCount(addlTokens, trialTextTokens);
  const condMaxRef = Math.max(1, condTokens.length);
  const condRatio = clamp(((condOverlap + 0.5 * addlOverlap) / condMaxRef) * 100, 0, 100);
  const condition = Math.round(0.40 * (condRatio)); // up to 40

  // Age suitability
  let ageScore = 0;
  if (typeof profile.age === "number" && Number.isFinite(profile.age)) {
    const a = profile.age as number;
    const inRange = a >= trial.minAge && a <= trial.maxAge;
    if (inRange) ageScore = 30; // full
    else {
      const dist = a < trial.minAge ? trial.minAge - a : a - trial.maxAge;
      if (dist <= 2) ageScore = 22; // near miss within 2 years
      else if (dist <= 5) ageScore = 15;
      else ageScore = 0;
    }
  } else {
    ageScore = 15; // unknown age: partial credit to not block initial matches
  }
  const age = ageScore;

  // Gender
  let genderScore = 0;
  const g = (profile.gender || "").toLowerCase();
  if (!g) genderScore = 5; // unknown gets partial
  else if (trial.gender === "All") genderScore = 10;
  else if ((trial.gender.toLowerCase() === "female" && g.startsWith("fem")) || (trial.gender.toLowerCase() === "male" && g.startsWith("male"))) genderScore = 10;
  else genderScore = 0;
  const gender = genderScore;

  // Medications positive signal if intervention mentions same terms
  const medsTokens = (profile.medications || []).flatMap(tokenize);
  const medsOverlap = intersectCount(medsTokens, trialTextTokens);
  const meds = clamp(medsOverlap * 3, 0, 10); // up to 10

  // Allergies negative if intervention contains allergen terms
  const allergyTokens = (profile.allergies || []).flatMap(tokenize);
  const allergyOverlap = intersectCount(allergyTokens, trialTextTokens);
  const allergies = clamp(-allergyOverlap * 5, -10, 0); // down to -10

  // Completeness boost based on healthProfile portion only (max 10)
  const { breakdown } = computeProfileCompletion();
  const completenessBoost = Math.round((breakdown.healthProfile / 35) * 10);

  const raw = base + condition + age + gender + meds + allergies + completenessBoost;
  const score = clamp(Math.round(raw), 0, 100);
  return { score, breakdown: { base, condition, age, gender, meds, allergies, completenessBoost } };
}

export function getMatchedTrialsForCurrentUser(): Trial[] {
  const profile = readCurrentHealthProfile();
  // compute scores on a copy to avoid mutating shared state
  const list = staticTrials.map((t) => {
    const { score } = computeTrialMatchScore(t, profile);
    return { ...t, aiScore: score } as Trial;
  });
  // sort descending by score, stable by original order
  return list.sort((a, b) => b.aiScore - a.aiScore);
}

function pickPhase(study: CtgovStudy): string {
  const p = study.protocolSection?.designModule?.phases || [];
  if (!p || p.length === 0) return "";
  // phases come like ["PHASE2"] or human readable; normalize basic
  const raw = String(p[0]);
  if (/PHASE\s*1\/2/i.test(raw) || /1\/2/.test(raw)) return "Phase I/II";
  if (/PHASE\s*2\/3/i.test(raw) || /2\/3/.test(raw)) return "Phase II/III";
  const m = raw.match(/\d+/);
  return m ? `Phase ${m[0]}` : raw;
}

function ctStatus(study: CtgovStudy): string {
  const s = study.protocolSection?.statusModule?.overallStatus || "";
  if (/recruit/i.test(s)) return "Recruiting";
  return s || "";
}

function ctLocation(study: CtgovStudy): string {
  const loc = study.protocolSection?.contactsLocationsModule?.locations?.[0];
  if (!loc) return "";
  return [loc.city, loc.state].filter(Boolean).join(", ");
}

function parseRadiusMi(r?: string): number | undefined {
  if (!r) return undefined;
  const m = String(r).match(/([0-9]+)(mi|km)?/i);
  if (!m) return undefined;
  const val = Number(m[1]);
  if (!Number.isFinite(val)) return undefined;
  const unit = (m[2] || 'mi').toLowerCase();
  return unit === 'km' ? Math.round(val * 0.621371) : val;
}

function haversineMi(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
  return R * c;
}

function nearestLocation(study: CtgovStudy, lat?: number, lng?: number): { label: string; distanceMi?: number } {
  const locs = study.protocolSection?.contactsLocationsModule?.locations || [];
  if (!locs || locs.length === 0) return { label: '' };
  if (!lat || !lng) {
    const first = locs[0];
    return { label: [first.city, first.state].filter(Boolean).join(', ') };
    }
  let best: { label: string; distanceMi: number } | null = null;
  for (const loc of locs) {
    const city = loc.city || '';
    const state = loc.state || '';
    const label = [city, state].filter(Boolean).join(', ');
    // Ct.gov minimal fields lack lat/lng per site; fallback to label only
    if (!label) continue;
    // Without per-site coords, we approximate by geocoding via user-provided city/state string overlap handled by API; keep label.
    if (!best) best = { label, distanceMi: 0 };
  }
  return best || { label: '' };
}

function tokenizeArray(arr?: string[]): string[] {
  return (arr || []).flatMap((x) => tokenize(x));
}

function summarizeReason(study: CtgovStudy, profile: MinimalProfile): string {
  const title = study.protocolSection?.identificationModule?.briefTitle || "";
  const titleToks = tokenize(title);
  const studyConds = study.protocolSection?.conditionsModule?.conditions || [];
  const studyCondToks = tokenizeArray(studyConds);
  const condToks = tokenize(profile.primaryCondition || "");
  const addlToks = tokenize(profile.additionalInfo || "");
  const pool = new Set(titleToks.concat(studyCondToks));
  const matched: string[] = [];
  for (const t of condToks.concat(addlToks)) if (pool.has(t) && matched.length < 4) matched.push(t);
  const status = study.protocolSection?.statusModule?.overallStatus || "";
  const loc = ctLocation(study);
  const pref = readLocationPref();
  const pieces: string[] = [];
  if (status) pieces.push(/recruit/i.test(status) ? "Recruiting" : status);
  if (matched.length) pieces.push(`Matched on: ${matched.join(', ')}`);
  if (loc) pieces.push(`Site: ${loc}`);
  if (pref.loc) pieces.push(`Near: ${pref.loc}`);
  if (pref.radius) pieces.push(`Within ${pref.radius}`);
  const s = pieces.join(" · ");
  return s.length > 160 ? s.slice(0, 157) + "..." : s;
}

function computeStudyScore(study: CtgovStudy, profile: MinimalProfile): number {
  const title = study.protocolSection?.identificationModule?.briefTitle || "";
  const titleToks = tokenize(title);
  const studyConds = study.protocolSection?.conditionsModule?.conditions || [];
  const studyCondToks = tokenizeArray(studyConds);
  const condToks = tokenize(profile.primaryCondition || "");
  const addlToks = tokenize(profile.additionalInfo || "");
  const condOverlap = intersectCount(titleToks.concat(studyCondToks), condToks.concat(addlToks));
  const condMaxRef = Math.max(1, condToks.length + addlToks.length);
  const condRatio = clamp((condOverlap / condMaxRef) * 100, 0, 100);
  const condition = Math.round(0.6 * condRatio); // up to 60

  const status = study.protocolSection?.statusModule?.overallStatus || "";
  const base = /recruit/i.test(status) ? 25 : 10; // favor recruiting

  const locTokens = tokenize(ctLocation(study));
  const addlTokens = tokenize(profile.additionalInfo || "");
  const pref = readLocationPref();
  const prefTokens = tokenize(pref.loc || "");
  const locOverlap = intersectCount(locTokens, addlTokens.concat(prefTokens));
  const locScore = clamp(locOverlap * 5, 0, 15);

  const { breakdown } = computeProfileCompletion();
  const completenessBoost = Math.round((breakdown.healthProfile / 35) * 10);

  return clamp(base + condition + ageLikeBoost(profile, study) + locScore + completenessBoost, 0, 100);
}

function ageLikeBoost(profile: MinimalProfile, study: CtgovStudy): number {
  // Optional minor boost when age range seems compatible based on min/max present in study title/conditions
  // This is a placeholder-neutral helper that returns 0 for now since CtGov light data here lacks min/max fields.
  return 0;
}

export async function getRealMatchedTrialsForCurrentUser(limit = 50): Promise<LiteTrial[]> {
  const profile = readCurrentHealthProfile();
  const qPrimary = (profile.primaryCondition || "").trim();
  const qAltTokens = tokenize(profile.additionalInfo || "");
  const qAlt = qAltTokens.slice(0, 3).join(" ");
  const q = qPrimary || qAlt || "";

  const pageSize = Math.max(10, Math.min(100, limit));
  const statuses = [
    'RECRUITING',
    'ENROLLING_BY_INVITATION',
    'NOT_YET_RECRUITING',
    'ACTIVE_NOT_RECRUITING',
  ];

  const { loc } = readLocationPref();
  const geo = await geocodeLocPref();
  const fetchSet = async (query: string) => {
    const results = await Promise.all(statuses.map((s) => fetchStudies({ q: query, status: s, pageSize, loc, lat: geo.lat, lng: geo.lng, radius: geo.radius })));
    return results.flatMap((r) => r.studies || []);
  };

  let studies = await fetchSet(q);
  if (!studies || studies.length === 0) {
    const r = await fetchStudies({ q, pageSize, loc, lat: geo.lat, lng: geo.lng, radius: geo.radius });
    studies = r.studies || [];
  }
  if ((!studies || studies.length === 0) && q && q !== qPrimary) {
    const r2 = await fetchStudies({ q: qPrimary, pageSize, loc, lat: geo.lat, lng: geo.lng, radius: geo.radius });
    studies = r2.studies || [];
  }
  if (!studies) studies = [];

  const seen = new Set<string>();
  const list: LiteTrial[] = [];
  for (const s of studies) {
    const nct = s.protocolSection?.identificationModule?.nctId || "";
    if (!nct || seen.has(nct)) continue;
    seen.add(nct);
    const title = s.protocolSection?.identificationModule?.briefTitle || nct;
    const status = ctStatus(s);
    const phase = pickPhase(s);
    const center = s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || "";
    const location = ctLocation(s);
    const aiScore = computeStudyScore(s, profile);
    const conds = s.protocolSection?.conditionsModule?.conditions || [];
    const reason = summarizeReason(s, profile);
    list.push({
      slug: nct.toLowerCase(),
      nctId: nct,
      title,
      status,
      phase,
      aiScore,
      interventions: conds.slice(0, 3),
      center,
      location,
      reason,
    });
  }

  list.sort((a, b) => b.aiScore - a.aiScore);

  // Try AI rescoring for the top 15 when an AI backend is configured; fallback silently otherwise
  try {
    const { scoreTopKWithAI } = await import('./aiScoring');
    const rescored = await scoreTopKWithAI(list, 15, profile);
    return rescored;
  } catch {
    return list;
  }
}
