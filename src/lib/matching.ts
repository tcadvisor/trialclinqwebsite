import { trials as staticTrials, type Trial } from "./trials";
import { computeProfileCompletion } from "./profile";
import { fetchStudies, type CtgovStudy } from "./ctgov";

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
  if (age == null) age = parseAgeFromEligibility();
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

function tokenizeArray(arr?: string[]): string[] {
  return (arr || []).flatMap((x) => tokenize(x));
}

function computeStudyScore(study: CtgovStudy, profile: MinimalProfile): number {
  const title = study.protocolSection?.identificationModule?.briefTitle || "";
  const titleToks = tokenize(title);
  const condToks = tokenize(profile.primaryCondition || "");
  const condOverlap = intersectCount(titleToks, condToks);
  const condMaxRef = Math.max(1, condToks.length);
  const condRatio = clamp((condOverlap / condMaxRef) * 100, 0, 100);
  const condition = Math.round(0.55 * condRatio); // up to 55

  const status = study.protocolSection?.statusModule?.overallStatus || "";
  const base = /recruit/i.test(status) ? 25 : 10; // favor recruiting

  const locTokens = tokenize(ctLocation(study));
  const addlTokens = tokenize(profile.additionalInfo || "");
  const locOverlap = intersectCount(locTokens, addlTokens);
  const locScore = clamp(locOverlap * 3, 0, 10);

  const { breakdown } = computeProfileCompletion();
  const completenessBoost = Math.round((breakdown.healthProfile / 35) * 10);

  return clamp(base + condition + locScore + completenessBoost, 0, 100);
}

export async function getRealMatchedTrialsForCurrentUser(limit = 50): Promise<LiteTrial[]> {
  const profile = readCurrentHealthProfile();
  const q = (profile.primaryCondition || "").trim();
  const res = await fetchStudies({ q, status: "Recruiting", pageSize: Math.max(10, Math.min(100, limit)) });
  const studies = (res.studies || []).slice();
  const list: LiteTrial[] = studies.map((s) => {
    const nct = s.protocolSection?.identificationModule?.nctId || "";
    const title = s.protocolSection?.identificationModule?.briefTitle || nct;
    const status = ctStatus(s);
    const phase = pickPhase(s);
    const center = s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || "";
    const location = ctLocation(s);
    const aiScore = computeStudyScore(s, profile);
    return {
      slug: nct.toLowerCase(),
      nctId: nct,
      title,
      status,
      phase,
      aiScore,
      interventions: [],
      center,
      location,
    };
  });
  // Sort by score desc
  list.sort((a, b) => b.aiScore - a.aiScore);
  return list;
}
