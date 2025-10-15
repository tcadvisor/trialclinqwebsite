import { fetchStudyByNctId, type CtgovStudy } from './ctgov';

import { fetchStudyByNctId, type CtgovStudy } from './ctgov';
import { readLocPref } from './geocode';

type MinimalProfile = {
  age?: number | null;
  gender?: string | null;
  primaryCondition?: string | null;
  medications?: string[];
  allergies?: string[];
  additionalInfo?: string | null;
};

export type AiScoreResult = { score: number; rationale?: string };

const CACHE_KEY = 'tc_ai_scores_v4';

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function safeJson<T>(s: string): T | null {
  try {
    const cleaned = s.trim().replace(/^```\w*\n|```$/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function readCache(): Record<string, { score: number; ts: number; rationale?: string }> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, { score: number; ts: number; rationale?: string }>;
  } catch {
    return {};
  }
}

function writeCache(map: Record<string, { score: number; ts: number; rationale?: string }>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch {}
}

function profileFingerprint(p: MinimalProfile): string {
  const canonical = JSON.stringify({
    age: p.age ?? null,
    gender: (p.gender || '').toLowerCase(),
    primaryCondition: (p.primaryCondition || '').toLowerCase(),
    meds: (p.medications || []).map((m) => String(m)).sort(),
    allergies: (p.allergies || []).map((a) => String(a)).sort(),
    info: (p.additionalInfo || '').toLowerCase(),
  });
  return hash(canonical);
}

function profileToText(p: MinimalProfile): string {
  const lines: string[] = [];
  if (typeof p.age === 'number') lines.push(`Age: ${p.age}`);
  if (p.gender) lines.push(`Gender: ${p.gender}`);
  if (p.primaryCondition) lines.push(`Primary condition: ${p.primaryCondition}`);
  if (p.medications && p.medications.length) lines.push(`Current medications: ${p.medications.join(', ')}`);
  if (p.allergies && p.allergies.length) lines.push(`Allergies: ${p.allergies.join(', ')}`);
  if (p.additionalInfo) lines.push(`Additional info: ${p.additionalInfo}`);
  const lp = readLocPref();
  if (lp.loc) lines.push(`Home location: ${lp.loc}`);
  if (lp.radius) lines.push(`Travel radius: ${lp.radius}`);
  return lines.join('\n');
}

function studyToText(study: CtgovStudy): string {
  const id = study.protocolSection?.identificationModule?.nctId || '';
  const title = study.protocolSection?.identificationModule?.briefTitle || '';
  const status = study.protocolSection?.statusModule?.overallStatus || '';
  const conditions = study.protocolSection?.conditionsModule?.conditions || [];
  const phases = study.protocolSection?.designModule?.phases || [];
  const loc = study.protocolSection?.contactsLocationsModule?.locations?.[0];
  const location = [loc?.city, loc?.state, loc?.country].filter(Boolean).join(', ');
  const summary = (study as any)?.protocolSection?.descriptionModule?.briefSummary || '';
  const criteria = (study as any)?.protocolSection?.eligibilityModule?.eligibilityCriteria || '';
  const critShort = String(criteria).slice(0, 1200);
  return [
    `NCT: ${id}`,
    `Title: ${title}`,
    `Status: ${status}`,
    `Conditions: ${conditions.join('; ')}`,
    `Phases: ${phases.join(', ')}`,
    `Location: ${location}`,
    summary ? `Summary: ${summary}` : '',
    critShort ? `Eligibility Criteria: ${critShort}` : '',
  ].filter(Boolean).join('\n');
}

function isAiConfigured() {
  const url = (import.meta as any).env?.VITE_AI_SCORER_URL as string | undefined;
  const key = (import.meta as any).env?.VITE_OPENAI_API_KEY as string | undefined;
  // In browser, require a serverless webhook to avoid exposing the OpenAI key and avoid CORS issues.
  if (typeof window !== 'undefined') return Boolean(url);
  return Boolean(url || key);
}

async function callWebhook(url: string, payload: any, signal?: AbortSignal): Promise<AiScoreResult | null> {
  // Cache webhook health in localStorage to avoid repeated failing fetches that pollute logs.
  const key = 'tc_ai_webhook_status_v1';
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const obj = JSON.parse(raw) as { ok: boolean; ts: number };
        const age = Date.now() - (obj.ts || 0);
        // If webhook known-bad in last 10 minutes, skip attempts
        if (!obj.ok && age < 1000 * 60 * 10) return null;
      } catch {}
    }
  } catch {}

  const attempt = async (): Promise<AiScoreResult | null> => {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal });
      if (!res.ok) {
        try { localStorage.setItem(key, JSON.stringify({ ok: false, ts: Date.now() })); } catch {}
        return null;
      }
      const data = await res.json().catch(() => null);
      if (!data) {
        try { localStorage.setItem(key, JSON.stringify({ ok: false, ts: Date.now() })); } catch {}
        return null;
      }
      try { localStorage.setItem(key, JSON.stringify({ ok: true, ts: Date.now() })); } catch {}
      const score = typeof data.score === 'number' ? clamp(Math.round(data.score)) : Number(data.score);
      if (!Number.isFinite(score)) return null;
      return { score: clamp(Math.round(score)), rationale: String(data.rationale || data.reason || '') };
    } catch {
      try { localStorage.setItem(key, JSON.stringify({ ok: false, ts: Date.now() })); } catch {}
      return null;
    }
  };

  const r1 = await attempt();
  if (r1) return r1;
  await new Promise((r) => setTimeout(r, 500));
  return attempt();
}

async function callOpenAI(prompt: string, signal?: AbortSignal): Promise<AiScoreResult | null> {
  // Direct OpenAI calls are only allowed from server-side. In browser, return null to avoid fetch failures/CORS and key leakage.
  if (typeof window !== 'undefined') return null;
  const key = (import.meta as any).env?.VITE_OPENAI_API_KEY as string | undefined;
  if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'You score clinical trial eligibility and fit. Output ONLY valid compact JSON with fields score (0-100 integer) and rationale (<=160 chars). Do not include any other text.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content as string | undefined;
    if (!content) return null;
    const parsed = safeJson<{ score: number; rationale?: string }>(content);
    if (!parsed || !Number.isFinite(parsed.score)) return null;
    return { score: clamp(Math.round(parsed.score)), rationale: parsed.rationale };
  } catch {
    return null;
  }
}

export async function scoreStudyWithAI(nctId: string, profile: MinimalProfile, signal?: AbortSignal): Promise<AiScoreResult | null> {
  const fp = profileFingerprint(profile);
  const cacheKey = `${fp}|${nctId}`;
  const cache = readCache();
  const hit = cache[cacheKey];
  if (hit && Date.now() - hit.ts < 1000 * 60 * 60 * 24 * 7) {
    return { score: hit.score, rationale: hit.rationale };
  }

  if (!isAiConfigured()) return null;

  const detail = await fetchStudyByNctId(nctId, signal);
  const study = (detail.studies && detail.studies[0]) as CtgovStudy | undefined;
  if (!study) return null;

  const pText = profileToText(profile);
  const sText = studyToText(study);

  const prompt = `Patient Profile\n${pText}\n\nTrial\n${sText}\n\nScoring guidance:\n- Base score from inclusion/exclusion likelihood and condition match\n- Strongly penalize if outside Travel radius; strongly reward if inside\n- Reward status Recruiting; weigh phase modestly\n- Return an integer 0-100 with meaningful variance across trials\n\nStrictly output JSON: {"score": 0-100 integer, "rationale": "<=160 chars"}.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let result: AiScoreResult | null = null;
  // Prefer serverless scorer first (secure, reliable); then direct OpenAI
  const configuredUrl = (import.meta as any).env?.VITE_AI_SCORER_URL as string | undefined;
  const defaultUrl = '/.netlify/functions/ai-scorer';
  const webhookUrl = configuredUrl || defaultUrl;
  result = await callWebhook(webhookUrl, { profile, nctId, study, prompt }, controller.signal);
  if (!result) {
    result = await callOpenAI(prompt, controller.signal);
  }
  if (!result) {
    return null;
  }

  clearTimeout(timeout);

  if (result) {
    cache[cacheKey] = { score: result.score, rationale: result.rationale, ts: Date.now() };
    writeCache(cache);
  }

  return result;
}

export async function scoreTopKWithAI<T extends { nctId: string; aiScore: number; distanceMi?: number }>(
  items: T[],
  k: number,
  profile: MinimalProfile,
): Promise<Array<T & { aiRationale?: string }>> {
  const top = items.slice(0, Math.min(k, items.length));

  // Run rescoring in background to avoid blocking UI and surfacing fetch errors.
  (async () => {
    try {
      const queue = [...top];
      const results: Array<{ idx: number; score?: number; rationale?: string }> = new Array(queue.length);

      async function worker(startIdx: number) {
        for (let i = startIdx; i < queue.length; i += 3) {
          const t = queue[i];
          try {
            const r = await scoreStudyWithAI(t.nctId, profile);
            if (r) results[i] = { idx: i, score: r.score, rationale: r.rationale };
          } catch (e) {
            // swallow per-item errors
          }
        }
      }

      await Promise.all([worker(0), worker(1), worker(2)]);

      // If we got results, write to cache and notify UI
      let updated = false;
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r && typeof r.score === 'number') {
          // update localStorage cache via scoreStudyWithAI already wrote cache; just mark updated
          updated = true;
        }
      }
      if (updated) {
        try { window.dispatchEvent(new Event('storage')); } catch {}
      }
    } catch (e) {
      // silent
    }
  })();

  // Immediately return original list; background task will update cache and UI later
  const merged = items.map((it) => ({ ...it } as any));
  merged.sort((a, b) => {
    const s = (b.aiScore ?? 0) - (a.aiScore ?? 0);
    if (s !== 0) return s;
    const da = typeof (a as any).distanceMi === 'number' ? (a as any).distanceMi : Number.POSITIVE_INFINITY;
    const db = typeof (b as any).distanceMi === 'number' ? (b as any).distanceMi : Number.POSITIVE_INFINITY;
    return da - db;
  });
  return merged as any;
}
