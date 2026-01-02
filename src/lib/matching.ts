import { trials as staticTrials, type Trial } from "./trials";
import { computeProfileCompletion } from "./profile";
import { fetchStudies, fetchStudyByNctId, type CtgovStudy } from "./ctgov";
import { geocodeLocPref, geocodeText } from "./geocode";

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

function buildMatchFingerprint(profile: MinimalProfile, locPref: { loc: string; radius?: string }): string {
  const meds = Array.isArray(profile.medications) ? [...profile.medications].map((m) => String(m || "").toLowerCase().trim()).sort() : [];
  const allergies = Array.isArray(profile.allergies) ? [...profile.allergies].map((a) => String(a || "").toLowerCase().trim()).sort() : [];
  return JSON.stringify({
    age: profile.age ?? null,
    gender: (profile.gender || "").toLowerCase().trim(),
    primaryCondition: (profile.primaryCondition || "").toLowerCase().trim(),
    additionalInfo: (profile.additionalInfo || "").toString().trim(),
    meds,
    allergies,
    loc: (locPref.loc || "").toLowerCase().trim(),
    radius: (locPref.radius || "").toLowerCase().trim(),
  });
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
      const baseInfo = (p?.additionalInfo ? String(p.additionalInfo) : "").trim();
      const extras: string[] = [];
      if (p?.ecog) extras.push(`ECOG: ${p.ecog}`);
      if (p?.diseaseStage) extras.push(`Stage/Subtype: ${p.diseaseStage}`);
      if (p?.biomarkers) extras.push(`Biomarkers: ${p.biomarkers}`);
      if (Array.isArray(p?.priorTherapies) && p.priorTherapies.length) {
        const list = p.priorTherapies.map((t: any) => [t?.name, t?.date].filter(Boolean).join(' ')).filter(Boolean).join('; ');
        if (list) extras.push(`Prior tx: ${list}`);
      }
      if (p?.comorbidityCardiac || p?.comorbidityRenal || p?.comorbidityHepatic || p?.comorbidityAutoimmune) {
        const c = [p.comorbidityCardiac&&'cardiac', p.comorbidityRenal&&'renal', p.comorbidityHepatic&&'hepatic', p.comorbidityAutoimmune&&'autoimmune'].filter(Boolean).join(', ');
        if (c) extras.push(`Comorbidities: ${c}`);
      }
      if (p?.infectionHIV || p?.infectionHBV || p?.infectionHCV) {
        const inf = [p.infectionHIV&&'HIV', p.infectionHBV&&'HBV', p.infectionHCV&&'HCV'].filter(Boolean).join(', ');
        if (inf) extras.push(`Infections: ${inf}`);
      }
      const combined = [baseInfo, extras.join('\n')].filter(Boolean).join('\n');
      additionalInfo = combined || null;
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

type AgeRange = { min?: number; max?: number; maxExclusive?: boolean };

function tokenize(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

function matchesQuery(s: string, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const hay = s.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

function filterStudiesByQuery(studies: CtgovStudy[], rawQuery: string): CtgovStudy[] {
  const tokens = tokenize(rawQuery);
  if (!tokens.length) return studies;
  return studies.filter((s) => {
    const title = (s.protocolSection?.identificationModule?.briefTitle || "").toString();
    const conditions = (s.protocolSection?.conditionsModule?.conditions || []).join(" ");
    const hay = `${title} ${conditions}`;
    return matchesQuery(hay, tokens);
  });
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
  const raw = (study.protocolSection?.statusModule?.overallStatus || "").toString();
  const up = raw.toUpperCase();
  if (up === 'RECRUITING') return 'Recruiting';
  if (up === 'ENROLLING_BY_INVITATION') return 'Enrolling by invitation';
  return raw || '';
}

function ctLocation(study: CtgovStudy): string {
  const loc = study.protocolSection?.contactsLocationsModule?.locations?.[0];
  if (!loc) return "";
  return [loc.city, loc.state].filter(Boolean).join(", ");
}

function ctLocationLabels(study: CtgovStudy): string[] {
  const locs = study.protocolSection?.contactsLocationsModule?.locations || [];
  const labels = locs
    .map((loc) => [loc.city, loc.state].filter(Boolean).join(", ").trim())
    .filter(Boolean);
  return Array.from(new Set(labels));
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

function parseCtgovAgeString(s?: string): number | undefined {
  const txt = (s || "").trim().toLowerCase();
  if (!txt || txt === "n/a" || txt === "na" || txt === "none") return undefined;
  const m = txt.match(/(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  let v = Number(m[1]);
  if (!Number.isFinite(v)) return undefined;
  if (/month/.test(txt)) v = v / 12;
  else if (/week/.test(txt)) v = v / 52;
  else if (/day/.test(txt)) v = v / 365;
  return v;
}

function structuredAgeRangeFromStudy(study?: CtgovStudy): AgeRange | null {
  const min = parseCtgovAgeString(study?.protocolSection?.eligibilityModule?.minimumAge);
  const max = parseCtgovAgeString(study?.protocolSection?.eligibilityModule?.maximumAge);
  if (min == null && max == null) return null;
  return { min: min ?? undefined, max: max ?? undefined, maxExclusive: false };
}

function structuredSexFromStudy(study?: CtgovStudy): 'male' | 'female' | 'all' | null {
  const raw = (study?.protocolSection?.eligibilityModule?.sex || "").toString().trim().toLowerCase();
  if (!raw) return null;
  if (raw === "all") return "all";
  if (raw.startsWith("female")) return "female";
  if (raw.startsWith("male")) return "male";
  return null;
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

export function computeStudyScore(study: CtgovStudy, profile: MinimalProfile): number {
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
  // Optional minor boost when age range seems compatible based on min/max present in title text
  const a = typeof profile.age === 'number' ? profile.age : null;
  if (a == null) return 0;
  const structured = structuredAgeRangeFromStudy(study);
  if (structured) {
    const { min, max, maxExclusive } = structured;
    if (min != null && a < min) return 0;
    if (max != null) {
      if (maxExclusive ? a >= max : a > max) return 0;
    }
    return 5;
  }
  const title = (study.protocolSection?.identificationModule?.briefTitle || '').toString();
  const rng = extractAgeRangeFromText(title);
  if (!rng) return 0;
  if (rng.min != null && a < rng.min) return 0;
  if (rng.max != null) {
    if (rng.maxExclusive ? a >= rng.max : a > rng.max) return 0;
  }
  // inside range: small positive boost
  return 5;
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
  if (/\b(pediatric|child|children|infant|adolescent)s?\b/.test(text)) return { max: 17, maxExclusive: false };
  if (/\bolder\s+adult|elderly|senior\b/.test(text)) return { min: 65 };
  if (/\badult(s)?\b/.test(text) && !/\b(child|children|pediatric)\b/.test(text)) return { min: 18 };
  return null;
}

function hasAny(src: string, terms: string[]): boolean {
  const t = (src || '').toLowerCase();
  return terms.some((x) => t.includes(x.toLowerCase()));
}

function evaluateAdvancedEligibility(profile: MinimalProfile, study: CtgovStudy, eligText?: string): { ok: boolean; reason?: string } {
  const info = (profile.additionalInfo || '').toLowerCase();
  const meds = (profile.medications || []).map((m) => String(m).toLowerCase());
  const combined = `${(study.protocolSection?.identificationModule?.briefTitle || '').toLowerCase()}\n${(eligText || '').toLowerCase()}`;

  // Required planned elective HPB/colorectal surgery
  const requiresElectiveSx = /(planned|schedule[rd])\s+(elective\s+)?(hepato|hepatobiliary|hepato[-\s]?pancreato[-\s]?biliary|pancreatic|colorectal)/.test(combined);
  if (requiresElectiveSx) {
    const hasSignal = hasAny(info, ['planned surgery', 'elective surgery', 'hepato', 'hepatobiliary', 'pancreat', 'colorectal', 'colectomy', 'whipple', 'hepatectomy']);
    if (!hasSignal) return { ok: false, reason: 'No qualifying elective HPB/colorectal surgery planned' };
  }

  // Exclude daily PDE5 inhibitors
  const pde5Terms = ['sildenafil', 'tadalafil', 'vardenafil', 'avanafil', 'pde5'];
  if (hasAny(combined, ['pde5', 'phosphodiesterase'])) {
    if (meds.some((m) => pde5Terms.some((k) => m.includes(k)))) return { ok: false, reason: 'Daily PDE5 inhibitor' };
  }

  // Exclude tamsulosin at baseline if mentioned
  if (hasAny(combined, ['tamsulosin therapy as a home medication', 'on tamsulosin at baseline', 'tamsulosin at baseline'])) {
    if (meds.some((m) => m.includes('tamsulosin') || m.includes('flomax'))) return { ok: false, reason: 'On tamsulosin at baseline' };
  }

  // GU procedure exclusions
  if (hasAny(combined, ['genitourinary', 'gu procedure', 'urology procedure', 'prostate', 'bladder', 'ureter', 'kidney'])) {
    if (hasAny(info, ['prostate surgery', 'cystectomy', 'bladder surgery', 'ureter', 'nephrectomy', 'urology procedure'])) return { ok: false, reason: 'GU procedure planned' };
  }

  // Same-day Foley removal exclusion
  if (hasAny(combined, ['same day foley removal', 'remove foley on day of surgery', 'pod0'])) {
    if (hasAny(info, ['same day foley', 'pod0 foley removal', 'immediate catheter removal'])) return { ok: false, reason: 'Same-day Foley removal planned' };
  }

  // NG tube retention POD1 exclusion
  if (hasAny(combined, ['ng tube retention', 'nasogastric tube retention', 'pod1'])) {
    if (hasAny(info, ['ng tube planned', 'nasogastric tube retention'])) return { ok: false, reason: 'NG tube retention planned' };
  }

  return { ok: true };
}

function extractGenderRestrictionFromText(s: string): 'male' | 'female' | null {
  const t = (s || '').toLowerCase();
  if (/(female|women|woman)\s*-?\s*only\b/.test(t) || /\bfemales?\s+only\b/.test(t)) return 'female';
  if (/(male|men|man)\s*-?\s*only\b/.test(t) || /\bmales?\s+only\b/.test(t)) return 'male';
  if (/women\sof\schild-bearing\s*potential|pregnan/i.test(t)) return 'female';
  return null;
}

function isAgeCompatible(userAge: number | null | undefined, s: CtgovStudy, eligText?: string): boolean {
  if (userAge == null || !Number.isFinite(userAge as number)) return true;
  const structured = structuredAgeRangeFromStudy(s);
  if (structured) {
    const { min, max, maxExclusive } = structured;
    if (min != null && (userAge as number) < min) return false;
    if (max != null) {
      if (maxExclusive ? (userAge as number) >= max : (userAge as number) > max) return false;
    }
    return true;
  }
  const title = (s.protocolSection?.identificationModule?.briefTitle || '').toString();
  const combined = `${title}\n${eligText || ''}`;
  const rng = extractAgeRangeFromText(combined);
  if (!rng) return true;
  const a = userAge as number;
  if (rng.min != null && a < rng.min) return false;
  if (rng.max != null) { if (rng.maxExclusive ? a >= rng.max : a > rng.max) return false; }
  return true;
}

function isGenderCompatible(userGender: string | null | undefined, s: CtgovStudy, eligText?: string): boolean {
  const g = (userGender || '').toLowerCase();
  if (!g) return true;
  const structured = structuredSexFromStudy(s);
  if (structured) {
    if (structured === 'all') return true;
    if (structured === 'female') return g.startsWith('fem');
    if (structured === 'male') return g.startsWith('male');
  }
  const title = (s.protocolSection?.identificationModule?.briefTitle || '').toString();
  const combined = `${title}\n${eligText || ''}`;
  const restr = extractGenderRestrictionFromText(combined);
  if (!restr) return true;
  if (restr === 'female' && !g.startsWith('fem')) return false;
  if (restr === 'male' && !g.startsWith('male')) return false;
  return true;
}

export async function getRealMatchedTrialsForCurrentUser(limit = 50): Promise<LiteTrial[]> {
  // Cache per session to avoid re-fetching on every view; clear by updating profile or eligibility
  const cacheKey = "__tc_cached_matches_v1";
  const profile = readCurrentHealthProfile();
  const locPref = readLocationPref();
  const fingerprint = buildMatchFingerprint(profile, locPref);
  const cached = (globalThis as any)[cacheKey] as { data: LiteTrial[]; ts: number; fingerprint?: string } | undefined;
  if (cached?.data?.length && cached.fingerprint === fingerprint) {
    return cached.data.slice(0, limit);
  }

  const qPrimary = (profile.primaryCondition || '').trim();
  const qAltTokens = tokenize(profile.additionalInfo || '');
  const qAlt = qAltTokens.slice(0, 3).join(' ');
  const q = qPrimary || qAlt || '';

  const pageSize = Math.max(10, Math.min(100, limit));
  const statuses = ['RECRUITING', 'ENROLLING_BY_INVITATION'];

  const { loc, radius } = locPref;
  let geo: any = {};
  try { geo = (await geocodeLocPref()) || {}; } catch { geo = {}; }
  const locText = (geo as any)?.label || loc;

  // Parse the user-specified radius; use only when we have geo
  const userRadiusMi = parseRadiusMi(radius);
  const hasUserRadius = typeof userRadiusMi === 'number' && Number.isFinite(userRadiusMi);
  const hasGeo = typeof geo.lat === 'number' && typeof geo.lng === 'number';
  const enforceRadius = hasUserRadius && hasGeo;
  if (hasUserRadius && !hasGeo) {
    const empty: LiteTrial[] = [];
    (empty as any).__noResultsWithinRadius = true;
    return empty;
  }

  const fetchSet = async (query: string, opts: { withGeo?: boolean; withStatuses?: boolean } = { withGeo: true, withStatuses: true }) => {
    const base = { q: query, pageSize } as any;
    if (opts.withGeo && hasGeo) {
      base.loc = locText;
      // If we can enforce a radius, use it as a hard barrier
      if (enforceRadius) {
        const rStr = `${userRadiusMi}mi`;
        const withGeo = { ...base, lat: geo.lat, lng: geo.lng, radius: rStr } as any;
        if (opts.withStatuses) {
          const results = await Promise.all(statuses.map((s) => fetchStudies({ ...withGeo, status: s })));
          const flat = results.flatMap((r) => r.studies || []);
          return flat;
        } else {
          const r = await fetchStudies(withGeo);
          return r.studies || [];
        }
      } else {
        // No user radius specified; try fetching with geo but without radius constraint
        const withGeo = { ...base, lat: geo.lat, lng: geo.lng } as any;
        if (opts.withStatuses) {
          const results = await Promise.all(statuses.map((s) => fetchStudies({ ...withGeo, status: s })));
          const flat = results.flatMap((r) => r.studies || []);
          return flat;
        } else {
          const r = await fetchStudies(withGeo);
          return r.studies || [];
        }
      }
    }

    base.loc = locText;
    if (opts.withStatuses) {
      const results = await Promise.all(statuses.map((s) => fetchStudies({ ...base, status: s })));
      return results.flatMap((r) => r.studies || []);
    } else {
      const r = await fetchStudies(base);
      return r.studies || [];
    }
  };

  const attempts: Array<{ query: string; opts: { withGeo?: boolean; withStatuses?: boolean }; filterAfter?: boolean; skipWhenEnforceRadius?: boolean }> = [
    { query: q, opts: { withGeo: true, withStatuses: true } },
    { query: q, opts: { withGeo: true, withStatuses: false }, skipWhenEnforceRadius: true },
    { query: q, opts: { withGeo: false, withStatuses: true } },
    { query: q, opts: { withGeo: false, withStatuses: false }, skipWhenEnforceRadius: true },
  ];
  if (locText) {
    attempts.push({ query: '', opts: { withGeo: true, withStatuses: true }, filterAfter: Boolean(q) });
  }
  attempts.push({ query: '', opts: { withGeo: false, withStatuses: true }, filterAfter: Boolean(q), skipWhenEnforceRadius: true });
  if (qPrimary && qPrimary !== q) {
    attempts.push({ query: qPrimary, opts: { withGeo: true, withStatuses: true } });
  }

  let studies: CtgovStudy[] = [];
  for (const attempt of attempts) {
    if (attempt.skipWhenEnforceRadius && enforceRadius) continue;
    try {
      const r = await fetchSet(attempt.query, attempt.opts);
      const filtered = attempt.filterAfter && q ? filterStudiesByQuery(r, q) : r;
      if (filtered && filtered.length > 0) { studies = filtered; break; }
    } catch {}
  }
  if (!studies) studies = [];

  const seen = new Set<string>();
  const list: (LiteTrial & { distanceMi?: number; inRadius?: boolean })[] = [];
  for (const s of studies) {
    const nct = s.protocolSection?.identificationModule?.nctId || '';
    if (!nct || seen.has(nct)) continue;
    const overall = (s.protocolSection?.statusModule?.overallStatus || '').toString().toUpperCase();
    if (overall !== 'RECRUITING' && overall !== 'ENROLLING_BY_INVITATION') continue;

    // Age/gender compatibility gate: prefer structured ct.gov fields when present
    if (!isAgeCompatible(profile.age, s)) continue;
    if (!isGenderCompatible(profile.gender, s)) continue;

    seen.add(nct);
    const title = s.protocolSection?.identificationModule?.briefTitle || nct;
    const status = ctStatus(s);
    const phase = pickPhase(s);
    const center = s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || '';
    const locations = ctLocationLabels(s);
    const location = locations[0] || ctLocation(s);
    let aiScore = computeStudyScore(s, profile);
    let aiRationale: string | undefined;
    const conds = s.protocolSection?.conditionsModule?.conditions || [];
    const reason = summarizeReason(s, profile);
    try {
      const { getCachedAiScore } = await import('./aiScoring');
      const cached = getCachedAiScore(nct, profile);
      if (cached && typeof cached.score === 'number') {
        aiScore = cached.score;
        aiRationale = cached.rationale;
      }
    } catch {}
    const trial = {
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
      aiRationale,
    } as LiteTrial & { locations?: string[] };
    trial.locations = locations;
    list.push(trial);
  }

  // Snapshot full list before radius enforcement for fallback suggestions
  const listForFallback = list.map((t) => ({ ...t } as LiteTrial & { distanceMi?: number; inRadius?: boolean }));

  let radMiComputed: number | undefined;
  let noResultsWithinRadius = false;
  try {
    const user = await geocodeLocPref();
    const uLat = typeof user.lat === 'number' ? user.lat : undefined;
    const uLng = typeof user.lng === 'number' ? user.lng : undefined;
    const radMi = parseRadiusMi(user.radius);
    radMiComputed = radMi;
    if (uLat != null && uLng != null) {
      const labels = Array.from(new Set(list.flatMap((t) => {
        const locs = ((t as any).locations as string[] | undefined) || [];
        const base = locs.length ? locs : [];
        const fallback = (t.location || '').trim();
        return [...base, fallback].map((l) => l.trim()).filter(Boolean);
      })));
      const locMap = new Map<string, { lat: number; lng: number }>();
      const geos = await Promise.all(labels.map(async (lbl) => {
        try { const g = await geocodeText(lbl); return [lbl, g] as const; } catch { return [lbl, null] as const; }
      }));
      for (const [lbl, g] of geos) {
        const glat = g && typeof g.lat === 'number' ? (g.lat as number) : undefined;
        const glng = g && typeof g.lng === 'number' ? (g.lng as number) : undefined;
        if (glat != null && glng != null) locMap.set(lbl, { lat: glat, lng: glng });
      }
      for (const t of list) {
        const locs = ((t as any).locations as string[] | undefined) || [];
        const candidates = locs.length ? locs : [(t.location || '').trim()].filter(Boolean);
        let bestLabel = '';
        let bestDistance: number | undefined;
        for (const raw of candidates) {
          const key = raw.trim();
          if (!key) continue;
          const g = locMap.get(key);
          if (g && typeof g.lat === 'number' && typeof g.lng === 'number') {
            const d = haversineMi(uLat, uLng, g.lat, g.lng);
            if (bestDistance == null || d < bestDistance) {
              bestDistance = d;
              bestLabel = key;
            }
          } else if (!bestLabel) {
            bestLabel = key;
          }
        }
        if (bestLabel) {
          t.location = bestLabel;
        }
        if (bestDistance != null) {
          t.distanceMi = Math.round(bestDistance);
          t.inRadius = typeof radMi === 'number' ? bestDistance <= radMi : undefined;
        }
      }
    }
  } catch {}

  // Prefer the user-entered radius when present; fall back to computed radius if available
  const effectiveRadiusMi = typeof radMiComputed === 'number' ? radMiComputed : (hasUserRadius ? userRadiusMi : undefined);

  // HARD BARRIER: Enforce radius strictly when we can
  if (enforceRadius && typeof effectiveRadiusMi === 'number') {
    const within = list.filter((t) => {
      // Require calculable distance when user explicitly set a radius
      if (typeof t.distanceMi !== 'number') return false;
      return (t.distanceMi as number) <= (effectiveRadiusMi as number);
    });
    noResultsWithinRadius = within.length === 0;
    list.length = 0;
    list.push(...within);
  } else if (typeof effectiveRadiusMi === 'number') {
    // If radius wasn't user-specified but was computed, apply as soft filter
    const within = list.filter((t) => typeof t.distanceMi !== 'number' || (t.distanceMi as number) <= (effectiveRadiusMi as number));
    if (within.length > 0) { list.length = 0; list.push(...within); }
  }

  // Build fallback suggestions outside radius when nothing matched within
  let fallbackSimilar: LiteTrial[] | undefined;
  if (noResultsWithinRadius && listForFallback.length) {
    const rmi = typeof effectiveRadiusMi === 'number' ? effectiveRadiusMi : undefined;
    const candidates = listForFallback.filter((t) => {
      if (rmi == null) return true;
      if (typeof t.distanceMi === 'number') return (t.distanceMi as number) > rmi;
      return true; // allow unknown distance to surface
    });
    const sorted = candidates.sort((a, b) => {
      const da = typeof a.distanceMi === 'number' ? a.distanceMi as number : Number.POSITIVE_INFINITY;
      const db = typeof b.distanceMi === 'number' ? b.distanceMi as number : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return (b.aiScore ?? 0) - (a.aiScore ?? 0);
    });
    fallbackSimilar = sorted.slice(0, 10);
  }

  // Store the no-results state for later use
  (list as any).__noResultsWithinRadius = noResultsWithinRadius;
  if (fallbackSimilar?.length) (list as any).__fallbackSimilar = fallbackSimilar;

  // Strict eligibility enforcement for top results using detailed criteria (age + gender + key clinical rules)
  async function applyEligibilityGate(items: typeof list, topN: number): Promise<typeof list> {
    const top = items.slice(0, Math.min(topN, items.length));
    const chunks: typeof top[] = [];
    for (let i = 0; i < top.length; i += 10) chunks.push(top.slice(i, i + 10));
    const toRemove = new Set<string>();
    for (const chunk of chunks) {
      const details = await Promise.all(chunk.map(async (t) => {
        try { return await fetchStudyByNctId(t.nctId); } catch { return { studies: [] as CtgovStudy[] }; }
      }));
      for (let i = 0; i < chunk.length; i++) {
        const t = chunk[i];
        const d = details[i];
        const s = (d.studies && d.studies[0]) as CtgovStudy | undefined;
        const elig = (s as any)?.protocolSection?.eligibilityModule?.eligibilityCriteria as string | undefined;
        const okAge = isAgeCompatible(profile.age, s || ({} as CtgovStudy), elig);
        const okGender = isGenderCompatible(profile.gender, s || ({} as CtgovStudy), elig);
        const adv = evaluateAdvancedEligibility(profile, s || ({} as CtgovStudy), elig);
        if (!okAge || !okGender || !adv.ok) toRemove.add(t.nctId);
      }
    }
    return items.filter((t) => !toRemove.has(t.nctId));
  }

  const gated = await applyEligibilityGate(list, 40);
  (gated as any).__noResultsWithinRadius = noResultsWithinRadius;
  if (fallbackSimilar?.length) (gated as any).__fallbackSimilar = fallbackSimilar;

  // Location influence: boost nearby trials significantly; mildly penalize far ones
  for (const t of gated) {
    if (typeof (t as any).distanceMi === 'number') {
      const d = (t as any).distanceMi as number;
      let boost = 0;
      if (typeof radMiComputed === 'number' && Number.isFinite(radMiComputed)) {
        const r = radMiComputed as number;
        if (d <= r) boost = 25 * (1 - d / r);
        else boost = -15 * Math.min(2, (d - r) / r);
      } else {
        const dd = Math.min(500, d);
        boost = 20 * (1 - dd / 500);
      }
      (t as any).aiScore = clamp(Math.round(((t as any).aiScore ?? 0) + boost), 0, 100);
    }
  }

  gated.sort((a, b) => {
    const s = (b.aiScore ?? 0) - (a.aiScore ?? 0);
    if (s !== 0) return s;
    const da = typeof a.distanceMi === 'number' ? a.distanceMi : Number.POSITIVE_INFINITY;
    const db = typeof b.distanceMi === 'number' ? b.distanceMi : Number.POSITIVE_INFINITY;
    return da - db;
  });

  try {
    const { scoreTopKWithAI } = await import('./aiScoring');
    const rescored = await scoreTopKWithAI(gated, 15, profile);
    (rescored as any).__noResultsWithinRadius = noResultsWithinRadius;
    if (fallbackSimilar?.length) (rescored as any).__fallbackSimilar = fallbackSimilar;
    (globalThis as any)[cacheKey] = { data: rescored, ts: Date.now(), fingerprint };
    return rescored.slice(0, limit);
  } catch {
    (globalThis as any)[cacheKey] = { data: gated, ts: Date.now(), fingerprint };
    return gated.slice(0, limit);
  }
}
