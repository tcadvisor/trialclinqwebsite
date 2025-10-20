type GeoResult = { lat: number; lng: number; label?: string };

import { safeFetch } from './fetchUtils';

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
  try {
    const key = q.trim();
    if (!key) return null;
    const cache = readCache();
    if (cache[key]) return { ...cache[key] };

    const configured = (import.meta as any).env?.VITE_GEO_WEBHOOK_URL as string | undefined;
    const url = configured || '/.netlify/functions/geocode';

    // In browser, only call the serverless webhook to avoid noisy CORS/network errors
    if (typeof window !== 'undefined') {
      try {
        const res = await safeFetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: key }) });
        if (res && res.ok) {
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
      } catch (e) {
        // swallow; do not attempt external public fetches from browser to avoid console noise/CORS
      }
      return null;
    }

    // Server-side: try webhook first then public geocoders
    try {
      const res = await safeFetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: key }) });
      if (res && res.ok) {
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
    } catch (e) {
      // swallow
    }

    try {
      // Normalize US variations first
      let normalizedKey = key;
      if (/^\s*(usa?|united\s+states?)\s*$/i.test(key)) {
        normalizedKey = 'United States';
      }

      const zip = String(normalizedKey).match(/^(\d{5})(?:-\d{4})?$/)?.[1];
      if (zip) {
        try {
          const zres = await safeFetch(`https://api.zippopotam.us/us/${zip}`);
          if (zres && zres.ok) {
            const z = await zres.json();
            const place = z?.places?.[0];
            const flat = Number(place?.latitude);
            const flng = Number(place?.longitude);
            const city = String(place?.["place name"] || place?.place || '').trim();
            const state = String(place?.["state abbreviation"] || place?.state || '').trim();
            const label = [city, state].filter(Boolean).join(', ');
            // Validate US coordinates (continental US bounds)
            if (Number.isFinite(flat) && Number.isFinite(flng) && state && flat > 24 && flat < 50 && flng > -130 && flng < -65) {
              cache[key] = { lat: flat, lng: flng, label };
              writeCache(cache);
              return { lat: flat, lng: flng, label };
            }
          }
        } catch (e) {
          // swallow individual external fetch errors
        }
      }
    } catch (e) {
      // swallow
    }

    try {
      const params = new URLSearchParams({ format: 'jsonv2', limit: '10', q: key });
      try {
        const nres = await safeFetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
        if (nres && nres.ok) {
          const arr = (await nres.json()) as Array<any>;
          if (arr && arr.length > 0) {
            // Prefer US results when searching (especially if query suggests US location)
            const keyUpper = key.toUpperCase();
            const usStateAbbr = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];
            const hasStateHint = usStateAbbr.some(s => keyUpper.includes(s)) || key.match(/georgia|california|texas|florida|new york|pennsylvania|ohio|illinois|michigan|north carolina|virginia|washington|colorado|arizona|tennessee|missouri|indiana|maryland|minnesota|wisconsin|massachusetts|louisiana|alabama|kentucky|oregon|oklahoma|connecticut|utah|iowa|nevada|arkansas|kansas|mississippi|new mexico|west virginia|nebraska|idaho|south dakota|north dakota|maine|montana|rhode island|delaware|south carolina|wyoming|vermont|alaska|hawaii|district of columbia/i);

            let first = arr[0];

            if (hasStateHint) {
              // Find best US match
              const usResults = arr.filter((r) => {
                const displayName = (r?.display_name || '').toUpperCase();
                return displayName.includes('UNITED STATES') || displayName.includes('USA') || displayName.includes(', US') || displayName.endsWith('US');
              });
              if (usResults.length > 0) {
                first = usResults[0];
              } else {
                // Fallback: prefer results with reasonable US coordinates
                first = arr.find((r) => {
                  const lat = Number(r?.lat);
                  const lng = Number(r?.lon);
                  return Number.isFinite(lat) && Number.isFinite(lng) && lat > 24 && lat < 50 && lng > -130 && lng < -65;
                }) || first;
              }
            }

            const flat = Number(first?.lat);
            const flng = Number(first?.lon);
            const label = (first?.display_name || '').toString();
            if (Number.isFinite(flat) && Number.isFinite(flng)) {
              cache[key] = { lat: flat, lng: flng, label };
              writeCache(cache);
              return { lat: flat, lng: flng, label };
            }
          }
        }
      } catch (e) {
        // swallow
      }
    } catch (e) {
      // swallow
    }

    return null;
  } catch (e) {
    return null;
  }
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
