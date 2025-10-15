export type ProfileBreakdown = {
  basics: number; // name + email
  consent: number; // consent checklist
  documents: number; // uploaded docs
  notifications: number; // pref setup
  healthProfile: number; // health profile fields, allergies, medications
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function computeProfileCompletion(): { percent: number; breakdown: ProfileBreakdown } {
  let basics = 0;
  let consent = 0;
  let documents = 0;
  let notifications = 0;
  let healthProfile = 0;

  // Basics from auth storage (max 20)
  try {
    const raw = localStorage.getItem("auth:v1");
    if (raw) {
      const parsed = JSON.parse(raw) as { user?: { email?: string; firstName?: string; lastName?: string } | null };
      const u = parsed?.user ?? {};
      if (u?.email) basics += 7;
      if (u?.firstName) basics += 7;
      if (u?.lastName) basics += 6;
    }
  } catch {}

  // Consent sections (max 20): 5 parts, 4 pts each
  try {
    const raw = localStorage.getItem("tc_consent");
    if (raw) {
      const v = JSON.parse(raw) as { section1?: boolean; section2?: boolean; section3?: boolean; section4?: boolean; final?: boolean };
      const parts = [v.section1, v.section2, v.section3, v.section4, v.final];
      const done = parts.reduce((acc, x) => acc + (x ? 1 : 0), 0);
      consent = clamp(done * 4, 0, 20);
    }
  } catch {}

  // Documents (max 20): up to 4 docs counted, 5 pts each
  try {
    const raw = localStorage.getItem("tc_docs");
    if (raw) {
      const arr = JSON.parse(raw);
      const count = Array.isArray(arr) ? arr.length : 0;
      documents = clamp(Math.min(count, 4) * 5, 0, 20);
    }
  } catch {}

  // Notifications preferences (max 5)
  try {
    const emailAlerts = JSON.parse(localStorage.getItem("tc_notify_email") || "true");
    const trialUpdates = JSON.parse(localStorage.getItem("tc_notify_trials") || "true");
    notifications = (emailAlerts ? 3 : 0) + (trialUpdates ? 2 : 0);
  } catch {}

  // Health profile completeness (max 35)
  try {
    const raw = localStorage.getItem("tc_health_profile_v1");
    if (raw) {
      const p = JSON.parse(raw) as {
        weight?: string; gender?: string; phone?: string; age?: string; race?: string; language?: string;
        bloodGroup?: string; genotype?: string; primaryCondition?: string; diagnosed?: string;
        allergies?: unknown[]; medications?: unknown[];
        ecog?: string; diseaseStage?: string; biomarkers?: string; priorTherapies?: unknown[];
      };
      const checks = [
        p.weight, p.gender, p.phone, p.age, p.race, p.language, p.bloodGroup, p.genotype, p.primaryCondition, p.diagnosed,
        (Array.isArray(p.allergies) && p.allergies.length > 0) ? "ok" : "",
        (Array.isArray(p.medications) && p.medications.length > 0) ? "ok" : "",
      ];
      const done = checks.reduce((acc, x) => acc + (x && String(x).trim() !== "" ? 1 : 0), 0);
      const ratio = done / checks.length;
      healthProfile = clamp(Math.round(ratio * 35), 0, 35);
    }
  } catch {}

  const breakdown: ProfileBreakdown = { basics, consent, documents, notifications, healthProfile };
  const percent = clamp(Math.round(basics + consent + documents + notifications + healthProfile));
  return { percent, breakdown };
}
