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

    // 1) ZIP-first resolver (US)
    const zip = q.match(/^\s*(\d{5})(?:-\d{4})?\s*$/)?.[1];
    if (zip) {
      try {
        const zres = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (zres.ok) {
          const z = await zres.json();
          const place = z?.places?.[0];
          const lat = Number(place?.latitude);
          const lng = Number(place?.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return cors(200, { lat, lng }, { "cache-control": "public, max-age=86400" });
          }
        }
      } catch {}
    }

    // 2) Fallback to Nominatim (any string)
    const params = new URLSearchParams({ format: 'jsonv2', limit: '1', q });
    const nres = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'user-agent': 'trialcliniq-geocoder/1.0 (+https://trialcliniq.com)' },
    });
    if (!nres.ok) return cors(404, { error: 'Not found' });
    const arr = (await nres.json()) as Array<any>;
    const first = arr?.[0];
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return cors(404, { error: 'Not found' });
    return cors(200, { lat, lng }, { "cache-control": "public, max-age=86400" });
  } catch (e: any) {
    return cors(500, { error: String(e?.message || e || 'Unknown error') });
  }
};
