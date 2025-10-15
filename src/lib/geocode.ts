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

  // attempt serverless first
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: loc }) });
    if (res.ok) {
      const data = (await res.json()) as any;
      const lat = Number(data.lat);
      const lng = Number(data.lng);
      const label = typeof data.label === 'string' ? data.label : undefined;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        cache[loc] = { lat, lng, label };
        writeCache(cache);
        return { lat, lng, label, radius };
      }
    }
  } catch {}

  // fallback 1: direct ZIP lookup (US)
  try {
    const zip = String(loc).match(/^(\d{5})(?:-\d{4})?$/)?.[1];
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
          cache[loc] = { lat: flat, lng: flng, label };
          writeCache(cache);
          return { lat: flat, lng: flng, label, radius };
        }
      }
    }
  } catch {}

  // fallback 2: direct Nominatim query (any string)
  try {
    const params = new URLSearchParams({ format: 'jsonv2', limit: '1', q: loc });
    const nres = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (nres.ok) {
      const arr = (await nres.json()) as Array<any>;
      const first = arr?.[0];
      const flat = Number(first?.lat);
      const flng = Number(first?.lon);
      const label = (first?.display_name || '').toString();
      if (Number.isFinite(flat) && Number.isFinite(flng)) {
        cache[loc] = { lat: flat, lng: flng, label };
        writeCache(cache);
        return { lat: flat, lng: flng, label, radius };
      }
    }
  } catch {}

  return { radius };
}
