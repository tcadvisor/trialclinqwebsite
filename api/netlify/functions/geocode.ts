import type { Handler } from "@netlify/functions";

function cors(statusCode: number, body: any, extra: Record<string,string> = {}) {
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "content-type": "application/json",
      ...extra,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(204, '');
  if (event.httpMethod !== 'POST') return cors(405, { error: 'Method not allowed' });

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const raw = (payload.q || '').toString();
    const q: string = raw.trim().replace(/\s+/g, ' ');
    if (!q) return cors(400, { error: 'Missing q' });

    // 1) ZIP-first resolver (US) - strict validation
    const zip = q.match(/^\s*(\d{5})(?:-\d{4})?\s*$/)?.[1];
    if (zip) {
      try {
        const zres = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (zres.ok) {
          const z = await zres.json();
          const place = z?.places?.[0];
          const lat = Number(place?.latitude);
          const lng = Number(place?.longitude);
          const city = String(place?.["place name"] || place?.place || '').trim();
          const state = String(place?.["state abbreviation"] || place?.state || '').trim();
          const label = [city, state].filter(Boolean).join(', ');
          if (Number.isFinite(lat) && Number.isFinite(lng) && state && lat > 24 && lat < 50 && lng > -130 && lng < -65) {
            return cors(200, { lat, lng, label }, { "cache-control": "public, max-age=86400" });
          }
        }
      } catch {}
    }

    const usStateAbbr = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];
    const usStateNames = [
      'alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia',
      'hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts',
      'michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico',
      'new york','north carolina','north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina',
      'south dakota','tennessee','texas','utah','vermont','virginia','washington','west virginia','wisconsin','wyoming',
      'district of columbia','washington dc','washington d.c.'
    ];
    const qUpper = q.toUpperCase();
    const qLower = q.toLowerCase();
    const hasStateHint = usStateAbbr.some(s => qUpper.includes(s)) || usStateNames.some((n) => qLower.includes(n));
    const looksLikeUS = hasStateHint || /\busa\b|\bunited states\b|\bUS\b/i.test(q) || q.match(/\d{5}/);
    const commaParts = q.split(",").map((p) => p.trim()).filter(Boolean);
    const lastPart = commaParts.length ? commaParts[commaParts.length - 1].toLowerCase() : "";
    const statePartIsUS = usStateAbbr.includes(lastPart.toUpperCase()) || usStateNames.includes(lastPart);

    const baseParams: Record<string, string> = { format: 'jsonv2', limit: '10' };
    if (looksLikeUS) baseParams.countrycodes = 'us';

    // 2) For text queries with state/city info, prefer US results and structured queries
    let params: URLSearchParams;
    const fetchNominatim = async (p: URLSearchParams) => {
      const nres = await fetch(`https://nominatim.openstreetmap.org/search?${p.toString()}`, {
        headers: { 'user-agent': 'trialcliniq-geocoder/1.0 (+https://trialcliniq.com)' },
      });
      if (!nres.ok) return null;
      return (await nres.json()) as Array<any>;
    };

    if (commaParts.length >= 2 && statePartIsUS) {
      const city = commaParts.slice(0, -1).join(", ").trim();
      const state = commaParts.slice(-1).join(", ").trim();
      params = new URLSearchParams({ ...baseParams, city, state, country: 'United States' });
    } else {
      const preferredQ = looksLikeUS ? `${q}, United States` : q;
      params = new URLSearchParams({ ...baseParams, q: preferredQ });
    }

    let arr = await fetchNominatim(params);
    if ((!arr || arr.length === 0) && looksLikeUS) {
      const retry = new URLSearchParams({ format: 'jsonv2', limit: '10', q });
      arr = await fetchNominatim(retry);
    }
    if ((!arr || arr.length === 0) && commaParts.length >= 2 && statePartIsUS) {
      const city = commaParts.slice(0, -1).join(", ").trim();
      const state = commaParts.slice(-1).join(", ").trim();
      const retry = new URLSearchParams({ format: 'jsonv2', limit: '10', q: `${city}, ${state}, United States` });
      arr = await fetchNominatim(retry);
    }
    if ((!arr || arr.length === 0) && usStateNames.includes(qLower)) {
      const retry = new URLSearchParams({ format: 'jsonv2', limit: '10', q: `${q}, United States` });
      arr = await fetchNominatim(retry);
    }
    if (!arr) return cors(404, { error: 'Not found' });

    let first = arr?.[0];

    // If state hint detected or zip-like pattern, prefer US results
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

    if (!first && looksLikeUS) {
      const retryParams = new URLSearchParams({ format: 'jsonv2', limit: '10', q });
      const retryArr = await fetchNominatim(retryParams);
      first = retryArr?.[0];
    }

    if (!first) return cors(404, { error: 'Not found' });
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    const label = (first?.display_name || '').toString();
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return cors(404, { error: 'Not found' });
    return cors(200, { lat, lng, label }, { "cache-control": "public, max-age=86400" });
  } catch (e: any) {
    return cors(500, { error: String(e?.message || e || 'Unknown error') });
  }
};
