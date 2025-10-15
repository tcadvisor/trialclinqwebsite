export type CtgovStudy = {
  protocolSection: {
    identificationModule: {
      nctId?: string
      briefTitle?: string
    }
    statusModule?: {
      overallStatus?: string
      startDateStruct?: { date?: string }
      primaryCompletionDateStruct?: { date?: string }
    }
    conditionsModule?: {
      conditions?: string[]
    }
    designModule?: {
      phases?: string[]
    }
    contactsLocationsModule?: {
      locations?: Array<{
        city?: string
        state?: string
        country?: string
      }>
    }
    sponsorCollaboratorsModule?: {
      leadSponsor?: { name?: string }
    }
  }
}

export type CtgovResponse = {
  studies?: CtgovStudy[]
  nextPageToken?: string
  totalCount?: number
}

export type CtgovQuery = {
  q?: string
  status?: string | string[]
  type?: string
  loc?: string
  lat?: number
  lng?: number
  radius?: string
  pageSize?: number
  pageToken?: string
  pageNumber?: number
}

export function buildStudiesUrl({ q = '', status = '', type = '', loc = '', lat, lng, radius, pageSize = 12, pageToken = '', pageNumber }: CtgovQuery) {
  const base = 'https://clinicaltrials.gov/api/v2/studies'
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
  ].join(',')

  const params = new URLSearchParams()
  params.set('format', 'json')
  params.set('pageSize', String(pageSize))
  params.set('fields', fields)
  params.set('countTotal', 'true')
  if (status) {
    const add = (s: string) => { const v = (s || '').trim(); if (v) params.append('filter.overallStatus', v.toUpperCase()); };
    if (Array.isArray(status)) status.forEach(add);
    else if (typeof status === 'string' && status.includes(',')) status.split(',').forEach(add);
    else add(String(status));
  }
  if (type) params.set('filter.studyType', type)
  if (q) params.set('query.cond', q)
  if (typeof lat === 'number' && typeof lng === 'number') {
    const r = radius || '50mi'
    params.set('filter.geo', `distance(${lat},${lng},${r})`)
  } else if (loc) {
    params.set('query.locn', loc)
  }
  if (typeof pageNumber === 'number' && pageNumber > 0) params.set('pageNumber', String(pageNumber))
  if (pageToken) params.set('pageToken', pageToken)

  return `${base}?${params.toString()}`
}

export async function fetchStudies(query: CtgovQuery, _signal?: AbortSignal): Promise<CtgovResponse> {
  try {
    const proxy = (import.meta as any).env?.VITE_CT_PROXY_URL as string | undefined || '/.netlify/functions/ctgov';
    const res = await fetch(proxy, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'studies', query }),
      signal: _signal,
    });
    if (!res.ok) {
      console.warn('fetchStudies proxy returned non-OK', res.status)
      try {
        const body = await res.json().catch(() => null)
        // If server returned an empty result set, normalize to empty response
        if (body && (Array.isArray(body.studies) || body.totalCount === 0)) return body as CtgovResponse
      } catch {}
      return { studies: [] }
    }
    return (await res.json()) as CtgovResponse
  } catch (e: any) {
    console.error('fetchStudies proxy error:', e)
    return { studies: [] }
  }
}

export function formatNearestSitePreview(study: CtgovStudy): string {
  const loc = study.protocolSection?.contactsLocationsModule?.locations?.[0]
  const parts = [loc?.city, loc?.state, loc?.country].filter(Boolean)
  return parts.join(', ')
}

export function ctgovStudyDetailUrl(study: CtgovStudy): string {
  const nct = study.protocolSection?.identificationModule?.nctId
  return nct ? `https://clinicaltrials.gov/study/${nct}` : '#'
}

export async function fetchStudyByNctId(nctId: string, _signal?: AbortSignal): Promise<CtgovResponse> {
  try {
    const proxy = (import.meta as any).env?.VITE_CT_PROXY_URL as string | undefined || '/.netlify/functions/ctgov';
    const res = await fetch(proxy, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'study', nctId }),
      signal: _signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`)
    }
    return (await res.json()) as CtgovResponse
  } catch (e: any) {
    console.error('fetchStudyByNctId proxy error:', e)
    return { studies: [] }
  }
}
