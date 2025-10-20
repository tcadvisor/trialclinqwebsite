// Utilities to build smarter ClinicalTrials.gov queries from natural language input

const STOP_WORDS = new Set<string>([
  'a','an','and','are','as','at','be','but','by','for','from','how','i','in','is','it','of','on','or','the','to','with','that','this','those','these','near','around','about','me','my','our','we','you'
]);

// Phrase/abbreviation expansions. Keys are lowercased patterns to detect in raw input.
const PHRASE_SYNONYMS: Array<{ pattern: RegExp; group: string[] }> = [
  // Oncology common
  { pattern: /\bbreast cancer\b/i, group: ['"breast cancer"','"triple negative breast cancer"','"breast neoplasms"','"mammary carcinoma"'] },
  { pattern: /\bprostate cancer\b/i, group: ['"prostate cancer"','"prostatic neoplasms"'] },
  { pattern: /\blung cancer\b/i, group: ['"lung cancer"','NSCLC','SCLC','"non small cell lung cancer"','"small cell lung cancer"'] },
  { pattern: /\bcolorectal cancer\b/i, group: ['"colorectal cancer"','CRC','"colon cancer"','"rectal cancer"'] },
  { pattern: /\bmelanoma\b/i, group: ['melanoma','"cutaneous melanoma"'] },
  { pattern: /\bovarian cancer\b/i, group: ['"ovarian cancer"','"ovarian neoplasms"'] },
  { pattern: /\bpancreatic cancer\b/i, group: ['"pancreatic cancer"','"pancreatic neoplasms"'] },
  { pattern: /\bbrain cancer\b|\bglioblastoma\b/i, group: ['glioblastoma','GBM','"brain tumor"','"brain neoplasms"'] },

  // Cardio/metabolic
  { pattern: /\bheart attack\b|\bmyocardial infarction\b|\bmi\b/i, group: ['"myocardial infarction"','"heart attack"','MI'] },
  { pattern: /\batrial fibrillation\b|\bafib\b/i, group: ['"atrial fibrillation"','AFib'] },
  { pattern: /\bcongestive heart failure\b|\bchf\b/i, group: ['"heart failure"','CHF','"congestive heart failure"'] },
  { pattern: /\bhypertension\b|\bhigh blood pressure\b/i, group: ['hypertension','"high blood pressure"'] },
  { pattern: /\btype\s*2\s*diabetes\b|\bt2d\b|\bdiabetes\b/i, group: ['"type 2 diabetes"','T2D','diabetes'] },
  { pattern: /\bobesity\b|\bweight loss\b/i, group: ['obesity','"weight loss"'] },

  // Pulmonary
  { pattern: /\bcopd\b|\bchronic obstructive pulmonary disease\b/i, group: ['COPD','"chronic obstructive pulmonary disease"'] },
  { pattern: /\bazthma\b|\basthma\b/i, group: ['asthma'] },

  // Neurology/psych
  { pattern: /\balzheimer'?s?\b|\bad\b/i, group: ['Alzheimer','"Alzheimer disease"','AD'] },
  { pattern: /\bparkinson'?s?\b/i, group: ['Parkinson','"Parkinson disease"'] },
  { pattern: /\bdepression\b|\bmajor depressive\b/i, group: ['depression','"major depressive disorder"','MDD'] },

  // Therapy modalities
  { pattern: /\bchemo\b|\bchemotherapy\b/i, group: ['chemotherapy','chemo'] },
  { pattern: /\bradiation\b|\bradiotherapy\b/i, group: ['radiation','radiotherapy'] },
  { pattern: /\bimmunotherapy\b|\bcheckpoint\b/i, group: ['immunotherapy','"immune checkpoint"','pembrolizumab','nivolumab','"PD-1"','"PD-L1"'] },

  // Staging/common modifiers
  { pattern: /\bstage\s*4\b|\bstage\s*iv\b|\bmetastatic\b/i, group: ['"stage iv"','"stage 4"','metastatic'] },
  { pattern: /\brecurrence\b|\brecurrent\b/i, group: ['recurrent','recurrence'] },
]

// Abbreviation single-token expansions
const TOKEN_SYNONYMS: Record<string,string[]> = {
  nsclc: ['"non small cell lung cancer"','NSCLC'],
  sclc: ['"small cell lung cancer"','SCLC'],
  tnbc: ['"triple negative breast cancer"','TNBC'],
  copd: ['COPD','"chronic obstructive pulmonary disease"'],
  afib: ['AFib','"atrial fibrillation"'],
  mi: ['MI','"myocardial infarction"'],
  crc: ['CRC','"colorectal cancer"'],
  gbm: ['GBM','glioblastoma'],
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function removeStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOP_WORDS.has(t))
}

export function buildSmartCondQuery(raw: string): string {
  const source = (raw || '').trim()
  if (!source) return ''

  const groups: string[] = []
  let working = source

  // Detect and group multi-word phrases and known patterns
  for (const entry of PHRASE_SYNONYMS) {
    if (entry.pattern.test(working)) {
      groups.push(`(${Array.from(new Set(entry.group)).join(' OR ')})`)
      working = working.replace(new RegExp(entry.pattern, 'gi'), ' ')
    }
  }

  let tokens = removeStopwords(tokenize(working))

  // Expand single-token abbreviations/synonyms
  const tokenGroups: string[] = []
  const residual: string[] = []
  for (const t of tokens) {
    const syn = TOKEN_SYNONYMS[t]
    if (syn) tokenGroups.push(`(${Array.from(new Set(syn)).join(' OR ')})`)
    else residual.push(t)
  }

  // Build residual term string as strict AND
  const residualAnd = residual.map((t) => (t.includes(' ') ? `"${t}"` : t)).join(' AND ')

  // Prefer to AND all term groups; within groups use OR
  const parts = [...groups, ...tokenGroups]
  if (residualAnd) parts.push(residualAnd)

  // If nothing special detected, return original trimmed
  if (parts.length === 0) return source

  return parts.join(' AND ')
}

export function buildLooseCondQuery(raw: string): string {
  const source = (raw || '').trim()
  if (!source) return ''

  const groups: string[] = []
  let working = source

  for (const entry of PHRASE_SYNONYMS) {
    if (entry.pattern.test(working)) {
      groups.push(`(${Array.from(new Set(entry.group)).join(' OR ')})`)
      working = working.replace(new RegExp(entry.pattern, 'gi'), ' ')
    }
  }

  let tokens = removeStopwords(tokenize(working))

  const tokenGroups: string[] = []
  const residual: string[] = []
  for (const t of tokens) {
    const syn = TOKEN_SYNONYMS[t]
    if (syn) tokenGroups.push(`(${Array.from(new Set(syn)).join(' OR ')})`)
    else residual.push(t)
  }

  const residualOr = residual.map((t) => (t.includes(' ') ? `"${t}"` : t)).join(' OR ')

  const parts = [...groups, ...tokenGroups]
  if (residualOr) parts.push(residualOr)
  if (parts.length === 0) return source
  return parts.join(' OR ')
}

export function normalizeLocation(raw: string): string {
  const s = (raw || '').trim()
  if (!s) return ''

  // Normalize US variations to consistent "United States" string
  if (/^\s*(usa?|united\s+states?)\s*$/i.test(s)) {
    return 'United States'
  }

  // Remove leading keywords like "near", "around", "in" while preserving postal/city terms
  return s.replace(/^\s*(near|around|in|within)\s+/i, '').replace(/\s{2,}/g,' ').trim()
}
