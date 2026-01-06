type GeoResult = { lat: number; lng: number; label?: string };

import { safeFetch } from './fetchUtils';

const CACHE_KEY = 'tc_geocode_cache_v1';
const ELIGIBILITY_KEY = 'tc_eligibility_profile';

const US_STATE_MAP: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

function toStateName(input: string): string | undefined {
  const trimmed = (input || "").trim();
  if (!trimmed) return undefined;
  const abbr = trimmed.toUpperCase();
  if (US_STATE_MAP[abbr]) return US_STATE_MAP[abbr];
  const lower = trimmed.toLowerCase();
  const match = Object.values(US_STATE_MAP).find((name) => name.toLowerCase() === lower);
  return match;
}

function readCache(): Record<string, GeoResult> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function writeCache(map: Record<string, GeoResult>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch {}
}

function buildGeocodeVariants(input: string): string[] {
  const base = input.trim().replace(/\s+/g, ' ');
  if (!base) return [];
  const variants = [base];
  const lower = base.toLowerCase();
  const parts = base.split(",").map((p) => p.trim()).filter(Boolean);
  const lastPart = parts.length ? parts[parts.length - 1] : "";
  const stateFromPart = toStateName(lastPart);
  const hasStateAbbr = Boolean(stateFromPart && lastPart.length === 2);
  const tokens = base.split(/[\s,]+/).map((t) => t.replace(/\./g, "").toUpperCase()).filter(Boolean);
  const hasAbbrToken = tokens.some((t) => Boolean(US_STATE_MAP[t]));
  const usStateNames = [
    'alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia',
    'hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts',
    'michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico',
    'new york','north carolina','north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina',
    'south dakota','tennessee','texas','utah','vermont','virginia','washington','west virginia','wisconsin','wyoming',
    'district of columbia','washington dc','washington d.c.'
  ];
  const looksLikeUS = hasAbbrToken || /\busa\b|\bunited states\b|\bUS\b/i.test(base) || lower.includes(" united states");
  if (!looksLikeUS) variants.push(`${base}, United States`);
  if (usStateNames.includes(lower)) variants.push(`${base}, United States`);
  if (lower === "new york") variants.push("New York, NY");
  if (lower === "washington") variants.push("Washington, DC");
  if (stateFromPart && parts.length >= 2) {
    const city = parts.slice(0, -1).join(", ").trim();
    if (city) {
      variants.push(`${city}, ${stateFromPart}`);
      variants.push(`${city}, ${stateFromPart}, United States`);
    }
  }
  if (stateFromPart && parts.length === 1) {
    variants.push(stateFromPart);
    variants.push(`${stateFromPart}, United States`);
  }
  return Array.from(new Set(variants));
}

async function browserNominatimLookup(query: string): Promise<GeoResult | null> {
  try {
    const params = new URLSearchParams({ format: 'jsonv2', limit: '1', q: query });
    const res = await safeFetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (!res || !res.ok) return null;
    const arr = (await res.json()) as Array<any>;
    const first = arr?.[0];
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    const label = (first?.display_name || '').toString();
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, label };
  } catch {
    return null;
  }
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
    const url = configured || '/api/geocode';

    // In browser, only call the serverless webhook to avoid noisy CORS/network errors
    if (typeof window !== 'undefined') {
      const variants = buildGeocodeVariants(key);
      for (const variant of variants) {
        try {
          const res = await safeFetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: variant }) });
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
      }

      for (const variant of variants) {
        const g = await browserNominatimLookup(variant);
        if (g) {
          cache[key] = { lat: g.lat, lng: g.lng, label: g.label };
          writeCache(cache);
          return g;
        }
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
      const usStateAbbr = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];
      const usStateNames = [
        'alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia',
        'hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts',
        'michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico',
        'new york','north carolina','north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina',
        'south dakota','tennessee','texas','utah','vermont','virginia','washington','west virginia','wisconsin','wyoming',
        'district of columbia','washington dc','washington d.c.'
      ];
      const keyUpper = key.toUpperCase();
      const keyLower = key.toLowerCase();
      const hasStateHint = usStateAbbr.some(s => keyUpper.includes(s)) || usStateNames.some((n) => keyLower.includes(n));
      const looksLikeUS = hasStateHint || /\busa\b|\bunited states\b|\bUS\b/i.test(key) || key.match(/\d{5}/);
      const commaParts = key.split(",").map((p) => p.trim()).filter(Boolean);
      const lastPart = commaParts.length ? commaParts[commaParts.length - 1].toLowerCase() : "";
      const statePartIsUS = usStateAbbr.includes(lastPart.toUpperCase()) || usStateNames.includes(lastPart);
      const baseParams: Record<string, string> = { format: 'jsonv2', limit: '10' };
      if (looksLikeUS) baseParams.countrycodes = 'us';
      let params: URLSearchParams;
      if (commaParts.length >= 2 && statePartIsUS) {
        const city = commaParts.slice(0, -1).join(", ").trim();
        const state = commaParts.slice(-1).join(", ").trim();
        params = new URLSearchParams({ ...baseParams, city, state, country: 'United States' });
      } else if (usStateNames.includes(keyLower)) {
        params = new URLSearchParams({ ...baseParams, state: key, country: 'United States' });
      } else {
        const preferredKey = looksLikeUS ? `${key}, United States` : key;
        params = new URLSearchParams({ ...baseParams, q: preferredKey });
      }
      try {
        const nres = await safeFetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
        if (nres && nres.ok) {
          const arr = (await nres.json()) as Array<any>;
          if (arr && arr.length > 0) {
            // Prefer US results when searching (especially if query suggests US location)
            let first = arr[0];

            if (looksLikeUS) {
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
