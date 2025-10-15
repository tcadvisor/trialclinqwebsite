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

export async function geocodeText(q: string): Promise<{ lat?: number; lng?: number; label?: string } | null> {
  const key = q.trim();
  if (!key) return null;
  const cache = readCache();
  if (cache[key]) return { ...cache[key] };

  const configured = (import.meta as any).env?.VITE_GEO_WEBHOOK_URL as string | undefined;
  const url = configured || '/.netlify/functions/geocode';

  // In browser, prefer serverless endpoint; if unavailable, fall back to public geocoders
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: key }) });
      if (res.ok) {
        const data = (await res.json()) as any;
        const lat = Number(data.lat);
        const lng = Number(data.lng);
        const label = typeof data.label === 'string' ? data.label : undefined;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          cache[key] = { lat, lng, label };
          writeCache(cache);
          return { lat, lng, label };
        }
      }
    } catch {}
    // Do not return; fall through to ZIP and OSM fallbacks below
  }

  // Server-side or fallback: try webhook again (no-op if fails), then public geocoders
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: key }) });
    if (res.ok) {
      const data = (await res.json()) as any;
      const lat = Number(data.lat);
      const lng = Number(data.lng);
      const label = typeof data.label === 'string' ? data.label : undefined;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        cache[key] = { lat, lng, label };
        writeCache(cache);
        return { lat, lng, label };
      }
    }
  } catch {}

  try {
    const zip = String(key).match(/^(\d{5})(?:-\d{4})?$/)?.[1];
    if (zip) {
      const zres = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (zres.ok) {
        const z = await zres.json();
        const place = z?.places?.[0];
        const flat = Number(place?.latitude);
        const flng = Number(place?.longitude);
        const city = String(place?.["place name"] || place?.place || '').trim();
        const state = String(place?.["state abbreviation"] || place?.state || '').trim();
        const label = [city, state].filter(Boolean).join(', ');
        if (Number.isFinite(flat) && Number.isFinite(flng)) {
          cache[key] = { lat: flat, lng: flng, label };
          writeCache(cache);
          return { lat: flat, lng: flng, label };
        }
      }
    }
  } catch {}

  try {
    const params = new URLSearchParams({ format: 'jsonv2', limit: '1', q: key });
    const nres = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (nres.ok) {
      const arr = (await nres.json()) as Array<any>;
      const first = arr?.[0];
      const flat = Number(first?.lat);
      const flng = Number(first?.lon);
      const label = (first?.display_name || '').toString();
      if (Number.isFinite(flat) && Number.isFinite(flng)) {
        cache[key] = { lat: flat, lng: flng, label };
        writeCache(cache);
        return { lat: flat, lng: flng, label };
      }
    }
  } catch {}

  return null;
}

export async function geocodeLocPref(): Promise<{ lat?: number; lng?: number; label?: string; radius?: string }> {
  const { loc, radius } = readLocPref();
  if (!loc) return { radius };

  const g = await geocodeText(loc);
  if (g && Number.isFinite(g.lat as any) && Number.isFinite(g.lng as any)) {
    return { ...g, radius };
  }
  return { radius };
}
