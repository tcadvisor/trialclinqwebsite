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
  status?: string
  type?: string
  loc?: string
  lat?: number
  lng?: number
  radius?: string
  pageSize?: number
  pageToken?: string
}

export function buildStudiesUrl({ q = '', status = '', type = '', loc = '', lat, lng, radius, pageSize = 12, pageToken = '' }: CtgovQuery) {
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
  if (status) params.set('filter.overallStatus', status)
  if (type) params.set('filter.studyType', type)
  if (q) params.set('query.cond', q)
  if (loc) params.set('query.locn', loc)
  if (typeof lat === 'number' && typeof lng === 'number') {
    const r = radius || '50mi'
    params.set('filter.geo', `distance(${lat},${lng},${r})`)
  }
  if (pageToken) params.set('pageToken', pageToken)

  return `${base}?${params.toString()}`
}

export async function fetchStudies(query: CtgovQuery, signal?: AbortSignal): Promise<CtgovResponse> {
  try {
    const url = buildStudiesUrl(query)
    const res = await fetch(url, { signal })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`)
    }
    return (await res.json()) as CtgovResponse
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { studies: [] }
    }
    throw e
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

export async function fetchStudyByNctId(nctId: string, signal?: AbortSignal): Promise<CtgovResponse> {
  try {
    const base = `https://clinicaltrials.gov/api/v2/studies/${encodeURIComponent(nctId)}`
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
    ].join(',')
    const url = `${base}?format=json&fields=${encodeURIComponent(fields)}`
    const res = await fetch(url, { signal })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`)
    }
    return (await res.json()) as CtgovResponse
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { studies: [] }
    }
    throw e
  }
}
