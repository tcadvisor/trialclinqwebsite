export type ProfileBreakdown = {
  basics: number; // name + email
  consent: number; // consent checklist
  documents: number; // uploaded docs
  notifications: number; // pref setup
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function computeProfileCompletion(): { percent: number; breakdown: ProfileBreakdown } {
  let basics = 0;
  let consent = 0;
  let documents = 0;
  let notifications = 0;

  // Basics from auth storage
  try {
    const raw = localStorage.getItem("auth:v1");
    if (raw) {
      const parsed = JSON.parse(raw) as { user?: { email?: string; firstName?: string; lastName?: string } | null };
      const u = parsed?.user ?? {};
      if (u?.email) basics += 10;
      if (u?.firstName) basics += 10;
      if (u?.lastName) basics += 10;
    }
  } catch {}

  // Consent sections (5 checkboxes: 4 sections + final). Each worth 6 points (total 30)
  try {
    const raw = localStorage.getItem("tc_consent");
    if (raw) {
      const v = JSON.parse(raw) as { section1?: boolean; section2?: boolean; section3?: boolean; section4?: boolean; final?: boolean };
      const parts = [v.section1, v.section2, v.section3, v.section4, v.final];
      const done = parts.reduce((acc, x) => acc + (x ? 1 : 0), 0);
      consent = clamp(done * 6, 0, 30);
    }
  } catch {}

  // Documents: up to 3 docs counted, 10% each (max 30)
  try {
    const raw = localStorage.getItem("tc_docs");
    if (raw) {
      const arr = JSON.parse(raw);
      const count = Array.isArray(arr) ? arr.length : 0;
      documents = clamp(Math.min(count, 3) * 10, 0, 30);
    }
  } catch {}

  // Notifications preferences: two important toggles worth 5 each (max 10)
  try {
    const emailAlerts = JSON.parse(localStorage.getItem("tc_notify_email") || "true");
    const trialUpdates = JSON.parse(localStorage.getItem("tc_notify_trials") || "true");
    notifications = (emailAlerts ? 5 : 0) + (trialUpdates ? 5 : 0);
  } catch {}

  const breakdown: ProfileBreakdown = { basics, consent, documents, notifications };
  const percent = clamp(Math.round(basics + consent + documents + notifications));
  return { percent, breakdown };
}
