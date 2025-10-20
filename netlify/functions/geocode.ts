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
    const q: string = (payload.q || '').toString().trim();
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

    // 2) For text queries with state/city info, prefer US results
    const params = new URLSearchParams({ format: 'jsonv2', limit: '10', q });
    const nres = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'user-agent': 'trialcliniq-geocoder/1.0 (+https://trialcliniq.com)' },
    });
    if (!nres.ok) return cors(404, { error: 'Not found' });
    const arr = (await nres.json()) as Array<any>;

    // Prefer US results when query contains state abbreviations or US state names
    const usStateAbbr = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];
    const qUpper = q.toUpperCase();
    const hasStateHint = usStateAbbr.some(s => qUpper.includes(s));

    let first = arr?.[0];

    // If state hint detected or zip-like pattern, prefer US results
    if (hasStateHint || q.match(/\d{5}/) || q.match(/georgia|california|texas|florida|new york|pennsylvania|ohio|illinois|michigan|north carolina|virginia|washington|colorado|arizona|tennessee|missouri|indiana|maryland|minnesota|wisconsin|massachusetts|washington|massachusetts|louisiana|alabama|kentucky|oregon|oklahoma|connecticut|utah|iowa|nevada|arkansas|kansas|mississippi|new mexico|west virginia|nebraska|idaho|south dakota|north dakota|maine|montana|rhode island|delaware|south carolina|wyoming|vermont|alaska|hawaii|district of columbia/i)) {
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
