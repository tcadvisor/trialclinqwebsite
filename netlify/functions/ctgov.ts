import type { Handler } from "@netlify/functions";

const CT_BASE = 'https://clinicaltrials.gov/api/v2';

function cors(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      "content-type": "application/json",
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(204, '');
  if (event.httpMethod !== 'POST') return cors(405, { error: 'Method not allowed' });

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const action = String(payload.action || '');

    if (action === 'study') {
      const nctId = String(payload.nctId || '').trim();
      if (!nctId) return cors(400, { error: 'Missing nctId' });
      const fields = [
        'protocolSection.identificationModule.nctId',
        'protocolSection.identificationModule.briefTitle',
        'protocolSection.statusModule.overallStatus',
        'protocolSection.conditionsModule.conditions',
        'protocolSection.designModule.phases',
        'protocolSection.contactsLocationsModule.locations',
        'protocolSection.sponsorCollaboratorsModule.leadSponsor',
        'protocolSection.descriptionModule.briefSummary',
        'protocolSection.eligibilityModule.eligibilityCriteria',
      ].join(',');
      const url = `${CT_BASE}/studies/${encodeURIComponent(nctId)}?format=json&fields=${encodeURIComponent(fields)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return cors(res.status, { error: text || `HTTP ${res.status}` });
      }
      const data = await res.json();
      return cors(200, data);
    }

    if (action === 'studies') {
      const query = payload.query || {};
      // Recreate server-side URL params similar to client buildStudiesUrl
      const fields = [
        'protocolSection.identificationModule.nctId',
        'protocolSection.identificationModule.briefTitle',
        'protocolSection.statusModule.overallStatus',
        'protocolSection.conditionsModule.conditions',
        'protocolSection.designModule.phases',
        'protocolSection.contactsLocationsModule.locations',
        'protocolSection.sponsorCollaboratorsModule.leadSponsor',
        'protocolSection.statusModule.startDateStruct',
        'protocolSection.statusModule.primaryCompletionDateStruct',
      ].join(',');
      const params = new URLSearchParams();
      params.set('format', 'json');
      params.set('pageSize', String(query.pageSize || 12));
      params.set('fields', fields);
      params.set('countTotal', 'true');

      if (query.status) {
        const add = (s: string) => { const v = (s || '').trim(); if (v) params.append('filter.overallStatus', v.toUpperCase()); };
        if (Array.isArray(query.status)) query.status.forEach(add);
        else if (typeof query.status === 'string' && query.status.includes(',')) query.status.split(',').forEach(add);
        else add(String(query.status));
      }
      if (query.type) params.set('filter.studyType', query.type);
      if (query.q) params.set('query.cond', query.q);
      if (typeof query.lat === 'number' && typeof query.lng === 'number') {
        const r = query.radius || '50mi';
        params.set('filter.geo', `distance(${query.lat},${query.lng},${r})`);
      } else if (query.loc) {
        params.set('query.locn', query.loc);
      }
      if (typeof query.pageNumber === 'number' && query.pageNumber > 0) params.set('pageNumber', String(query.pageNumber));
      if (query.pageToken) params.set('pageToken', query.pageToken);

      let url = `${CT_BASE}/studies?${params.toString()}`;
      let res = await fetch(url);
      if (!res.ok && res.status === 404) {
        // Fallback: retry without geo filter, using textual location if provided
        const p2 = new URLSearchParams(params);
        p2.delete('filter.geo');
        if (query.loc && !p2.get('query.locn')) p2.set('query.locn', query.loc);
        url = `${CT_BASE}/studies?${p2.toString()}`;
        res = await fetch(url);
      }
      if (!res.ok) {
        // Gracefully degrade to empty set on 404/400 to avoid client errors
        if (res.status === 404 || res.status === 400) return cors(200, { studies: [], totalCount: 0 });
        const text = await res.text().catch(() => '');
        return cors(res.status, { error: text || `HTTP ${res.status}` });
      }
      const data = await res.json();
      return cors(200, data);
    }

    return cors(400, { error: 'Unknown action' });
  } catch (e: any) {
    return cors(500, { error: String(e?.message || e || 'Unknown error') });
  }
};
