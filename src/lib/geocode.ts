type GeoResult = { lat: number; lng: number; label?: string };

const CACHE_KEY = 'tc_geocode_cache_v1';
const ELIGIBILITY_KEY = 'tc_eligibility_profile';

function readCache(): Record<string, GeoResult> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function writeCache(map: Record<string, GeoResult>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch {}
}

export function readLocPref(): { loc: string; radius?: string } {
  try {
    const raw = localStorage.getItem(ELIGIBILITY_KEY);
    if (!raw) return { loc: '' };
    const data = JSON.parse(raw) as Partial<Record<string,string>>;
    return { loc: String(data.loc || '').trim(), radius: String(data.radius || '').trim() || undefined };
  } catch { return { loc: '' }; }
}

export async function geocodeLocPref(): Promise<{ lat?: number; lng?: number; label?: string; radius?: string }> {
  const { loc, radius } = readLocPref();
  if (!loc) return { radius };

  const cache = readCache();
  if (cache[loc]) return { ...cache[loc], radius };

  const configured = (import.meta as any).env?.VITE_GEO_WEBHOOK_URL as string | undefined;
  const url = configured || '/.netlify/functions/geocode';

  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: loc }) });
    if (!res.ok) return { radius };
    const data = (await res.json()) as any;
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    const label = typeof data.label === 'string' ? data.label : undefined;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      cache[loc] = { lat, lng, label };
      writeCache(cache);
      return { lat, lng, label, radius };
    }
    return { radius };
  } catch {
    return { radius };
  }
}
