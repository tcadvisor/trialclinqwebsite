/**
 * Enhanced Search Engine for Clinical Trials
 * Implements efficient and accurate search with:
 * - Phonetic matching (Double Metaphone algorithm)
 * - Fuzzy matching with configurable thresholds
 * - Comprehensive medical synonym expansion
 * - Smart query parsing with NLP-like inference
 * - TF-IDF inspired relevance scoring
 */

// ============================================================================
// PHONETIC MATCHING - Double Metaphone Implementation
// ============================================================================

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

/**
 * Double Metaphone phonetic encoding for medical terms
 * Produces primary and secondary encodings for better matching
 */
export function doubleMetaphone(word: string): [string, string] {
  if (!word || word.length === 0) return ['', ''];

  const input = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (input.length === 0) return ['', ''];

  let primary = '';
  let secondary = '';
  let current = 0;
  const length = input.length;
  const last = length - 1;

  const charAt = (pos: number): string => (pos >= 0 && pos < length) ? input[pos] : '';
  const stringAt = (start: number, len: number, ...strs: string[]): boolean => {
    if (start < 0) return false;
    const target = input.substring(start, start + len);
    return strs.some(s => s === target);
  };

  // Skip silent letters at start
  if (stringAt(0, 2, 'GN', 'KN', 'PN', 'WR', 'PS')) {
    current++;
  }

  // Handle 'X' at beginning
  if (charAt(0) === 'X') {
    primary += 'S';
    secondary += 'S';
    current++;
  }

  while (current < length && (primary.length < 4 || secondary.length < 4)) {
    const ch = charAt(current);

    switch (ch) {
      case 'A':
      case 'E':
      case 'I':
      case 'O':
      case 'U':
      case 'Y':
        if (current === 0) {
          primary += 'A';
          secondary += 'A';
        }
        current++;
        break;

      case 'B':
        primary += 'P';
        secondary += 'P';
        current += (charAt(current + 1) === 'B') ? 2 : 1;
        break;

      case 'C':
        if (stringAt(current, 2, 'CH')) {
          primary += 'X';
          secondary += 'X';
          current += 2;
        } else if (stringAt(current, 2, 'CI', 'CE', 'CY')) {
          primary += 'S';
          secondary += 'S';
          current += 1;
        } else {
          primary += 'K';
          secondary += 'K';
          current += stringAt(current, 2, 'CK', 'CC', 'CQ') ? 2 : 1;
        }
        break;

      case 'D':
        if (stringAt(current, 2, 'DG')) {
          if (stringAt(current + 2, 1, 'I', 'E', 'Y')) {
            primary += 'J';
            secondary += 'J';
            current += 3;
          } else {
            primary += 'TK';
            secondary += 'TK';
            current += 2;
          }
        } else {
          primary += 'T';
          secondary += 'T';
          current += stringAt(current, 2, 'DT', 'DD') ? 2 : 1;
        }
        break;

      case 'F':
        primary += 'F';
        secondary += 'F';
        current += (charAt(current + 1) === 'F') ? 2 : 1;
        break;

      case 'G':
        if (charAt(current + 1) === 'H') {
          if (current > 0 && !VOWELS.has(charAt(current - 1))) {
            current += 2;
          } else if (current === 0) {
            primary += 'K';
            secondary += 'K';
            current += 2;
          } else {
            primary += 'K';
            secondary += 'K';
            current += 2;
          }
        } else if (charAt(current + 1) === 'N') {
          if (current === 0) {
            current += 2;
          } else {
            primary += 'KN';
            secondary += 'N';
            current += 2;
          }
        } else if (stringAt(current + 1, 1, 'I', 'E', 'Y')) {
          primary += 'J';
          secondary += 'K';
          current += 2;
        } else {
          primary += 'K';
          secondary += 'K';
          current += (charAt(current + 1) === 'G') ? 2 : 1;
        }
        break;

      case 'H':
        if (current === 0 || VOWELS.has(charAt(current - 1))) {
          if (VOWELS.has(charAt(current + 1))) {
            primary += 'H';
            secondary += 'H';
          }
        }
        current++;
        break;

      case 'J':
        primary += 'J';
        secondary += 'J';
        current += (charAt(current + 1) === 'J') ? 2 : 1;
        break;

      case 'K':
        primary += 'K';
        secondary += 'K';
        current += (charAt(current + 1) === 'K') ? 2 : 1;
        break;

      case 'L':
        primary += 'L';
        secondary += 'L';
        current += (charAt(current + 1) === 'L') ? 2 : 1;
        break;

      case 'M':
        primary += 'M';
        secondary += 'M';
        current += (charAt(current + 1) === 'M') ? 2 : 1;
        break;

      case 'N':
        primary += 'N';
        secondary += 'N';
        current += (charAt(current + 1) === 'N') ? 2 : 1;
        break;

      case 'P':
        if (charAt(current + 1) === 'H') {
          primary += 'F';
          secondary += 'F';
          current += 2;
        } else {
          primary += 'P';
          secondary += 'P';
          current += stringAt(current, 2, 'PP', 'PB') ? 2 : 1;
        }
        break;

      case 'Q':
        primary += 'K';
        secondary += 'K';
        current += (charAt(current + 1) === 'Q') ? 2 : 1;
        break;

      case 'R':
        primary += 'R';
        secondary += 'R';
        current += (charAt(current + 1) === 'R') ? 2 : 1;
        break;

      case 'S':
        if (stringAt(current, 2, 'SH')) {
          primary += 'X';
          secondary += 'X';
          current += 2;
        } else if (stringAt(current, 3, 'SIO', 'SIA')) {
          primary += 'X';
          secondary += 'S';
          current += 3;
        } else {
          primary += 'S';
          secondary += 'S';
          current += stringAt(current, 2, 'SS', 'SC') ? 2 : 1;
        }
        break;

      case 'T':
        if (stringAt(current, 4, 'TION')) {
          primary += 'XN';
          secondary += 'XN';
          current += 4;
        } else if (stringAt(current, 2, 'TH')) {
          primary += '0';
          secondary += 'T';
          current += 2;
        } else {
          primary += 'T';
          secondary += 'T';
          current += stringAt(current, 2, 'TT', 'TD') ? 2 : 1;
        }
        break;

      case 'V':
        primary += 'F';
        secondary += 'F';
        current += (charAt(current + 1) === 'V') ? 2 : 1;
        break;

      case 'W':
        if (charAt(current + 1) === 'R') {
          primary += 'R';
          secondary += 'R';
          current += 2;
        } else if (current === 0 && VOWELS.has(charAt(current + 1))) {
          primary += 'A';
          secondary += 'F';
          current++;
        } else {
          current++;
        }
        break;

      case 'X':
        primary += 'KS';
        secondary += 'KS';
        current += (charAt(current + 1) === 'X') ? 2 : 1;
        break;

      case 'Z':
        primary += 'S';
        secondary += 'S';
        current += (charAt(current + 1) === 'Z') ? 2 : 1;
        break;

      default:
        current++;
    }
  }

  return [primary.substring(0, 4), secondary.substring(0, 4)];
}

// ============================================================================
// COMPREHENSIVE MEDICAL SYNONYMS DATABASE
// ============================================================================

export interface MedicalTerm {
  canonical: string;
  synonyms: string[];
  abbreviations: string[];
  relatedTerms: string[];
  category: 'oncology' | 'cardiology' | 'neurology' | 'pulmonology' | 'metabolic' |
            'autoimmune' | 'infectious' | 'musculoskeletal' | 'psychiatric' | 'other';
}

export const MEDICAL_TERMS_DATABASE: MedicalTerm[] = [
  // Oncology
  {
    canonical: 'breast cancer',
    synonyms: ['mammary carcinoma', 'breast neoplasm', 'breast tumor', 'mammary tumor', 'breast malignancy'],
    abbreviations: ['BC'],
    relatedTerms: ['triple negative breast cancer', 'TNBC', 'HER2 positive', 'ER positive', 'hormone receptor positive'],
    category: 'oncology'
  },
  {
    canonical: 'lung cancer',
    synonyms: ['lung carcinoma', 'pulmonary cancer', 'lung neoplasm', 'bronchogenic carcinoma'],
    abbreviations: ['LC'],
    relatedTerms: ['non small cell lung cancer', 'NSCLC', 'small cell lung cancer', 'SCLC', 'adenocarcinoma', 'squamous cell'],
    category: 'oncology'
  },
  {
    canonical: 'prostate cancer',
    synonyms: ['prostatic carcinoma', 'prostatic neoplasm', 'prostate adenocarcinoma'],
    abbreviations: ['PC', 'PCa'],
    relatedTerms: ['metastatic prostate cancer', 'castration resistant', 'mCRPC', 'hormone sensitive'],
    category: 'oncology'
  },
  {
    canonical: 'colorectal cancer',
    synonyms: ['colon cancer', 'rectal cancer', 'bowel cancer', 'colorectal carcinoma', 'intestinal cancer'],
    abbreviations: ['CRC'],
    relatedTerms: ['metastatic colorectal', 'mCRC', 'colon adenocarcinoma'],
    category: 'oncology'
  },
  {
    canonical: 'melanoma',
    synonyms: ['malignant melanoma', 'cutaneous melanoma', 'skin melanoma'],
    abbreviations: [],
    relatedTerms: ['metastatic melanoma', 'uveal melanoma', 'acral melanoma'],
    category: 'oncology'
  },
  {
    canonical: 'leukemia',
    synonyms: ['blood cancer', 'leukemic disease'],
    abbreviations: ['ALL', 'AML', 'CLL', 'CML'],
    relatedTerms: ['acute lymphoblastic leukemia', 'acute myeloid leukemia', 'chronic lymphocytic leukemia', 'chronic myeloid leukemia'],
    category: 'oncology'
  },
  {
    canonical: 'lymphoma',
    synonyms: ['lymphatic cancer', 'lymphoid neoplasm'],
    abbreviations: ['NHL', 'HL'],
    relatedTerms: ['non-Hodgkin lymphoma', 'Hodgkin lymphoma', 'diffuse large B-cell lymphoma', 'DLBCL', 'follicular lymphoma'],
    category: 'oncology'
  },
  {
    canonical: 'pancreatic cancer',
    synonyms: ['pancreatic carcinoma', 'pancreatic neoplasm', 'pancreas cancer'],
    abbreviations: ['PDAC'],
    relatedTerms: ['pancreatic ductal adenocarcinoma', 'metastatic pancreatic'],
    category: 'oncology'
  },
  {
    canonical: 'ovarian cancer',
    synonyms: ['ovarian carcinoma', 'ovarian neoplasm', 'ovary cancer'],
    abbreviations: [],
    relatedTerms: ['epithelial ovarian cancer', 'serous ovarian', 'high grade serous'],
    category: 'oncology'
  },
  {
    canonical: 'glioblastoma',
    synonyms: ['glioblastoma multiforme', 'brain cancer', 'brain tumor', 'GBM'],
    abbreviations: ['GBM'],
    relatedTerms: ['high grade glioma', 'astrocytoma', 'brain neoplasm'],
    category: 'oncology'
  },

  // Cardiology
  {
    canonical: 'heart failure',
    synonyms: ['cardiac failure', 'congestive heart failure', 'heart insufficiency'],
    abbreviations: ['HF', 'CHF', 'HFrEF', 'HFpEF'],
    relatedTerms: ['reduced ejection fraction', 'preserved ejection fraction', 'acute heart failure', 'chronic heart failure'],
    category: 'cardiology'
  },
  {
    canonical: 'atrial fibrillation',
    synonyms: ['AF', 'irregular heartbeat', 'cardiac arrhythmia'],
    abbreviations: ['AFib', 'AF'],
    relatedTerms: ['paroxysmal AFib', 'persistent AFib', 'permanent AFib', 'atrial flutter'],
    category: 'cardiology'
  },
  {
    canonical: 'myocardial infarction',
    synonyms: ['heart attack', 'acute coronary syndrome', 'cardiac infarction'],
    abbreviations: ['MI', 'AMI', 'STEMI', 'NSTEMI'],
    relatedTerms: ['acute MI', 'ST elevation', 'non-ST elevation'],
    category: 'cardiology'
  },
  {
    canonical: 'hypertension',
    synonyms: ['high blood pressure', 'elevated blood pressure', 'arterial hypertension'],
    abbreviations: ['HTN', 'HBP'],
    relatedTerms: ['essential hypertension', 'resistant hypertension', 'pulmonary hypertension'],
    category: 'cardiology'
  },
  {
    canonical: 'coronary artery disease',
    synonyms: ['coronary heart disease', 'ischemic heart disease', 'atherosclerotic heart disease'],
    abbreviations: ['CAD', 'CHD', 'IHD'],
    relatedTerms: ['angina', 'coronary stenosis', 'atherosclerosis'],
    category: 'cardiology'
  },

  // Neurology
  {
    canonical: 'alzheimer disease',
    synonyms: ['alzheimers', 'alzheimer\'s disease', 'senile dementia', 'dementia of alzheimer type'],
    abbreviations: ['AD'],
    relatedTerms: ['dementia', 'cognitive decline', 'memory loss', 'mild cognitive impairment', 'MCI'],
    category: 'neurology'
  },
  {
    canonical: 'parkinson disease',
    synonyms: ['parkinsons', 'parkinson\'s disease', 'PD'],
    abbreviations: ['PD'],
    relatedTerms: ['parkinsonism', 'tremor', 'movement disorder', 'bradykinesia'],
    category: 'neurology'
  },
  {
    canonical: 'multiple sclerosis',
    synonyms: ['MS', 'disseminated sclerosis'],
    abbreviations: ['MS', 'RRMS', 'SPMS', 'PPMS'],
    relatedTerms: ['relapsing remitting MS', 'secondary progressive MS', 'primary progressive MS'],
    category: 'neurology'
  },
  {
    canonical: 'epilepsy',
    synonyms: ['seizure disorder', 'convulsive disorder'],
    abbreviations: [],
    relatedTerms: ['seizure', 'convulsion', 'focal epilepsy', 'generalized epilepsy', 'drug resistant epilepsy'],
    category: 'neurology'
  },
  {
    canonical: 'migraine',
    synonyms: ['migraine headache', 'vascular headache'],
    abbreviations: [],
    relatedTerms: ['chronic migraine', 'episodic migraine', 'migraine with aura', 'migraine without aura', 'headache'],
    category: 'neurology'
  },
  {
    canonical: 'stroke',
    synonyms: ['cerebrovascular accident', 'brain attack', 'CVA'],
    abbreviations: ['CVA'],
    relatedTerms: ['ischemic stroke', 'hemorrhagic stroke', 'TIA', 'transient ischemic attack'],
    category: 'neurology'
  },

  // Pulmonology
  {
    canonical: 'chronic obstructive pulmonary disease',
    synonyms: ['COPD', 'chronic bronchitis', 'emphysema', 'chronic airway obstruction'],
    abbreviations: ['COPD'],
    relatedTerms: ['emphysema', 'chronic bronchitis', 'airflow obstruction'],
    category: 'pulmonology'
  },
  {
    canonical: 'asthma',
    synonyms: ['bronchial asthma', 'reactive airway disease'],
    abbreviations: [],
    relatedTerms: ['allergic asthma', 'severe asthma', 'exercise induced asthma', 'uncontrolled asthma'],
    category: 'pulmonology'
  },
  {
    canonical: 'pulmonary fibrosis',
    synonyms: ['lung fibrosis', 'interstitial lung disease'],
    abbreviations: ['IPF', 'ILD'],
    relatedTerms: ['idiopathic pulmonary fibrosis', 'interstitial pneumonia'],
    category: 'pulmonology'
  },

  // Metabolic
  {
    canonical: 'type 2 diabetes',
    synonyms: ['diabetes mellitus type 2', 'adult onset diabetes', 'non-insulin dependent diabetes', 'T2DM'],
    abbreviations: ['T2D', 'T2DM', 'DM2'],
    relatedTerms: ['diabetes', 'hyperglycemia', 'insulin resistance', 'prediabetes'],
    category: 'metabolic'
  },
  {
    canonical: 'type 1 diabetes',
    synonyms: ['diabetes mellitus type 1', 'juvenile diabetes', 'insulin dependent diabetes'],
    abbreviations: ['T1D', 'T1DM', 'DM1'],
    relatedTerms: ['autoimmune diabetes', 'diabetic ketoacidosis'],
    category: 'metabolic'
  },
  {
    canonical: 'obesity',
    synonyms: ['overweight', 'morbid obesity', 'severe obesity'],
    abbreviations: [],
    relatedTerms: ['weight loss', 'BMI', 'metabolic syndrome', 'bariatric'],
    category: 'metabolic'
  },
  {
    canonical: 'hyperlipidemia',
    synonyms: ['high cholesterol', 'dyslipidemia', 'hypercholesterolemia'],
    abbreviations: [],
    relatedTerms: ['LDL', 'HDL', 'triglycerides', 'familial hypercholesterolemia'],
    category: 'metabolic'
  },

  // Autoimmune
  {
    canonical: 'rheumatoid arthritis',
    synonyms: ['RA', 'inflammatory arthritis'],
    abbreviations: ['RA'],
    relatedTerms: ['joint inflammation', 'autoimmune arthritis', 'seropositive RA'],
    category: 'autoimmune'
  },
  {
    canonical: 'systemic lupus erythematosus',
    synonyms: ['lupus', 'SLE'],
    abbreviations: ['SLE'],
    relatedTerms: ['autoimmune disease', 'lupus nephritis'],
    category: 'autoimmune'
  },
  {
    canonical: 'psoriasis',
    synonyms: ['plaque psoriasis', 'psoriatic disease'],
    abbreviations: [],
    relatedTerms: ['psoriatic arthritis', 'PsA', 'skin psoriasis'],
    category: 'autoimmune'
  },
  {
    canonical: 'crohn disease',
    synonyms: ['crohns', 'crohn\'s disease', 'regional enteritis'],
    abbreviations: ['CD'],
    relatedTerms: ['inflammatory bowel disease', 'IBD', 'ileitis'],
    category: 'autoimmune'
  },
  {
    canonical: 'ulcerative colitis',
    synonyms: ['UC', 'colitis ulcerosa'],
    abbreviations: ['UC'],
    relatedTerms: ['inflammatory bowel disease', 'IBD', 'proctitis'],
    category: 'autoimmune'
  },

  // Psychiatric
  {
    canonical: 'major depressive disorder',
    synonyms: ['depression', 'clinical depression', 'major depression'],
    abbreviations: ['MDD'],
    relatedTerms: ['depressive episode', 'treatment resistant depression', 'TRD', 'unipolar depression'],
    category: 'psychiatric'
  },
  {
    canonical: 'anxiety disorder',
    synonyms: ['anxiety', 'generalized anxiety disorder'],
    abbreviations: ['GAD'],
    relatedTerms: ['panic disorder', 'social anxiety', 'phobia'],
    category: 'psychiatric'
  },
  {
    canonical: 'schizophrenia',
    synonyms: ['psychotic disorder', 'schizophrenic disorder'],
    abbreviations: [],
    relatedTerms: ['psychosis', 'schizoaffective disorder'],
    category: 'psychiatric'
  },
  {
    canonical: 'bipolar disorder',
    synonyms: ['manic depression', 'bipolar disease'],
    abbreviations: [],
    relatedTerms: ['mania', 'hypomania', 'mood disorder'],
    category: 'psychiatric'
  },
  {
    canonical: 'attention deficit hyperactivity disorder',
    synonyms: ['ADHD', 'ADD', 'attention deficit disorder'],
    abbreviations: ['ADHD', 'ADD'],
    relatedTerms: ['hyperactivity', 'inattention'],
    category: 'psychiatric'
  },

  // Musculoskeletal
  {
    canonical: 'osteoarthritis',
    synonyms: ['degenerative joint disease', 'wear and tear arthritis'],
    abbreviations: ['OA'],
    relatedTerms: ['knee osteoarthritis', 'hip osteoarthritis', 'joint pain'],
    category: 'musculoskeletal'
  },
  {
    canonical: 'osteoporosis',
    synonyms: ['bone loss', 'low bone density'],
    abbreviations: [],
    relatedTerms: ['osteopenia', 'bone fracture', 'fragility fracture'],
    category: 'musculoskeletal'
  },
  {
    canonical: 'chronic pain',
    synonyms: ['persistent pain', 'long term pain'],
    abbreviations: [],
    relatedTerms: ['neuropathic pain', 'fibromyalgia', 'back pain', 'nociceptive pain'],
    category: 'musculoskeletal'
  },
  {
    canonical: 'fibromyalgia',
    synonyms: ['fibromyalgia syndrome', 'chronic widespread pain'],
    abbreviations: ['FM', 'FMS'],
    relatedTerms: ['chronic fatigue', 'muscle pain', 'tender points'],
    category: 'musculoskeletal'
  },

  // Infectious
  {
    canonical: 'HIV',
    synonyms: ['human immunodeficiency virus', 'HIV infection', 'AIDS'],
    abbreviations: ['HIV', 'AIDS'],
    relatedTerms: ['antiretroviral', 'ART', 'viral load'],
    category: 'infectious'
  },
  {
    canonical: 'hepatitis C',
    synonyms: ['HCV', 'hepatitis C virus', 'chronic hepatitis C'],
    abbreviations: ['HCV'],
    relatedTerms: ['liver disease', 'cirrhosis', 'viral hepatitis'],
    category: 'infectious'
  },
  {
    canonical: 'hepatitis B',
    synonyms: ['HBV', 'hepatitis B virus', 'chronic hepatitis B'],
    abbreviations: ['HBV'],
    relatedTerms: ['liver disease', 'cirrhosis', 'viral hepatitis'],
    category: 'infectious'
  },
];

// Build lookup indices for fast searching
const termsByCanonical = new Map<string, MedicalTerm>();
const termsBySynonym = new Map<string, MedicalTerm>();
const termsByAbbreviation = new Map<string, MedicalTerm>();
const termsByPhonetic = new Map<string, MedicalTerm[]>();

function initializeIndices() {
  for (const term of MEDICAL_TERMS_DATABASE) {
    // Index by canonical
    termsByCanonical.set(term.canonical.toLowerCase(), term);

    // Index by synonyms
    for (const syn of term.synonyms) {
      termsBySynonym.set(syn.toLowerCase(), term);
    }

    // Index by abbreviations
    for (const abbr of term.abbreviations) {
      termsByAbbreviation.set(abbr.toLowerCase(), term);
    }

    // Index by phonetic encoding
    const [primary] = doubleMetaphone(term.canonical);
    if (primary) {
      const existing = termsByPhonetic.get(primary) || [];
      existing.push(term);
      termsByPhonetic.set(primary, existing);
    }
  }
}

initializeIndices();

// ============================================================================
// FUZZY MATCHING WITH LEVENSHTEIN DISTANCE
// ============================================================================

/**
 * Optimized Levenshtein distance with early termination
 */
export function levenshteinDistance(a: string, b: string, maxDistance?: number): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 0;
  if (aLower.length === 0) return bLower.length;
  if (bLower.length === 0) return aLower.length;

  // Early termination: if length difference exceeds max, return early
  if (maxDistance !== undefined && Math.abs(aLower.length - bLower.length) > maxDistance) {
    return maxDistance + 1;
  }

  // Use two-row optimization for memory efficiency
  let prev = Array.from({ length: bLower.length + 1 }, (_, i) => i);
  let curr = new Array(bLower.length + 1);

  for (let i = 1; i <= aLower.length; i++) {
    curr[0] = i;
    let minInRow = i;

    for (let j = 1; j <= bLower.length; j++) {
      const cost = aLower[i - 1] === bLower[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
      minInRow = Math.min(minInRow, curr[j]);
    }

    // Early termination if all values in row exceed max
    if (maxDistance !== undefined && minInRow > maxDistance) {
      return maxDistance + 1;
    }

    [prev, curr] = [curr, prev];
  }

  return prev[bLower.length];
}

/**
 * Jaro-Winkler similarity (better for short strings and typos)
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();

  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);

    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler modification: boost for common prefix
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

// ============================================================================
// SEARCH ENGINE CORE
// ============================================================================

export interface SearchMatch {
  term: MedicalTerm;
  score: number;
  matchType: 'exact' | 'synonym' | 'abbreviation' | 'phonetic' | 'fuzzy';
  matchedOn: string;
}

export interface ExpandedQuery {
  original: string;
  normalized: string;
  expansions: string[];
  matches: SearchMatch[];
  ctgovQuery: string;
  ctgovLooseQuery: string;
}

/**
 * Find medical term matches for a query
 */
export function findMedicalTermMatches(query: string): SearchMatch[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  const matches: SearchMatch[] = [];
  const seen = new Set<string>();

  // 1. Exact canonical match
  const exactCanonical = termsByCanonical.get(normalized);
  if (exactCanonical && !seen.has(exactCanonical.canonical)) {
    seen.add(exactCanonical.canonical);
    matches.push({
      term: exactCanonical,
      score: 1.0,
      matchType: 'exact',
      matchedOn: exactCanonical.canonical
    });
  }

  // 2. Exact synonym match
  const exactSynonym = termsBySynonym.get(normalized);
  if (exactSynonym && !seen.has(exactSynonym.canonical)) {
    seen.add(exactSynonym.canonical);
    matches.push({
      term: exactSynonym,
      score: 0.95,
      matchType: 'synonym',
      matchedOn: normalized
    });
  }

  // 3. Abbreviation match
  const abbrevMatch = termsByAbbreviation.get(normalized);
  if (abbrevMatch && !seen.has(abbrevMatch.canonical)) {
    seen.add(abbrevMatch.canonical);
    matches.push({
      term: abbrevMatch,
      score: 0.9,
      matchType: 'abbreviation',
      matchedOn: normalized.toUpperCase()
    });
  }

  // 4. Phonetic matching for typo tolerance
  const [primaryPhonetic] = doubleMetaphone(normalized);
  if (primaryPhonetic) {
    const phoneticMatches = termsByPhonetic.get(primaryPhonetic) || [];
    for (const term of phoneticMatches) {
      if (!seen.has(term.canonical)) {
        seen.add(term.canonical);
        matches.push({
          term,
          score: 0.8,
          matchType: 'phonetic',
          matchedOn: term.canonical
        });
      }
    }
  }

  // 5. Fuzzy matching using Jaro-Winkler for remaining terms
  if (normalized.length >= 3) {
    for (const term of MEDICAL_TERMS_DATABASE) {
      if (seen.has(term.canonical)) continue;

      // Check canonical
      const canonicalSim = jaroWinklerSimilarity(normalized, term.canonical);
      if (canonicalSim >= 0.85) {
        seen.add(term.canonical);
        matches.push({
          term,
          score: canonicalSim * 0.7,
          matchType: 'fuzzy',
          matchedOn: term.canonical
        });
        continue;
      }

      // Check synonyms
      for (const syn of term.synonyms) {
        const synSim = jaroWinklerSimilarity(normalized, syn);
        if (synSim >= 0.85 && !seen.has(term.canonical)) {
          seen.add(term.canonical);
          matches.push({
            term,
            score: synSim * 0.65,
            matchType: 'fuzzy',
            matchedOn: syn
          });
          break;
        }
      }
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Expand a search query with synonyms and related terms
 */
export function expandSearchQuery(rawQuery: string): ExpandedQuery {
  const normalized = rawQuery.toLowerCase().trim();
  const matches = findMedicalTermMatches(normalized);

  const expansions: string[] = [];

  for (const match of matches) {
    // Add canonical
    expansions.push(`"${match.term.canonical}"`);

    // Add top synonyms
    for (const syn of match.term.synonyms.slice(0, 2)) {
      expansions.push(`"${syn}"`);
    }

    // Add abbreviations
    for (const abbr of match.term.abbreviations) {
      expansions.push(abbr);
    }

    // Add related terms for high-confidence matches
    if (match.score >= 0.9) {
      for (const rel of match.term.relatedTerms.slice(0, 2)) {
        expansions.push(`"${rel}"`);
      }
    }
  }

  // If no matches found, use original query
  if (expansions.length === 0) {
    expansions.push(normalized.includes(' ') ? `"${normalized}"` : normalized);
  }

  // Build ClinicalTrials.gov query formats
  const uniqueExpansions = [...new Set(expansions)];
  const ctgovQuery = uniqueExpansions.slice(0, 5).join(' OR ');
  const ctgovLooseQuery = uniqueExpansions.join(' OR ');

  return {
    original: rawQuery,
    normalized,
    expansions: uniqueExpansions,
    matches,
    ctgovQuery,
    ctgovLooseQuery
  };
}

// ============================================================================
// AUTOCOMPLETE ENGINE
// ============================================================================

export interface AutocompleteSuggestion {
  text: string;
  type: 'condition' | 'synonym' | 'related';
  category: string;
  score: number;
}

/**
 * Get autocomplete suggestions for partial input
 */
export function getAutocompleteSuggestions(partial: string, limit = 8): AutocompleteSuggestion[] {
  const normalized = partial.toLowerCase().trim();
  if (normalized.length < 2) return [];

  const suggestions: AutocompleteSuggestion[] = [];
  const seen = new Set<string>();

  // Prefix matching on canonical terms (highest priority)
  for (const term of MEDICAL_TERMS_DATABASE) {
    if (term.canonical.toLowerCase().startsWith(normalized)) {
      if (!seen.has(term.canonical)) {
        seen.add(term.canonical);
        suggestions.push({
          text: term.canonical,
          type: 'condition',
          category: term.category,
          score: 1.0
        });
      }
    }
  }

  // Prefix matching on synonyms
  for (const term of MEDICAL_TERMS_DATABASE) {
    for (const syn of term.synonyms) {
      if (syn.toLowerCase().startsWith(normalized) && !seen.has(syn)) {
        seen.add(syn);
        suggestions.push({
          text: syn,
          type: 'synonym',
          category: term.category,
          score: 0.9
        });
      }
    }
  }

  // Contains matching for longer queries
  if (normalized.length >= 3) {
    for (const term of MEDICAL_TERMS_DATABASE) {
      if (term.canonical.toLowerCase().includes(normalized) && !seen.has(term.canonical)) {
        seen.add(term.canonical);
        suggestions.push({
          text: term.canonical,
          type: 'condition',
          category: term.category,
          score: 0.7
        });
      }
    }
  }

  // Fuzzy matching for typo tolerance
  if (normalized.length >= 3 && suggestions.length < limit) {
    for (const term of MEDICAL_TERMS_DATABASE) {
      if (seen.has(term.canonical)) continue;

      const similarity = jaroWinklerSimilarity(normalized, term.canonical);
      if (similarity >= 0.75) {
        seen.add(term.canonical);
        suggestions.push({
          text: term.canonical,
          type: 'condition',
          category: term.category,
          score: similarity * 0.6
        });
      }
    }
  }

  // Sort by score and return top results
  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, limit);
}

// ============================================================================
// SMART QUERY BUILDER
// ============================================================================

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from',
  'how', 'i', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'with',
  'that', 'this', 'those', 'these', 'near', 'around', 'about', 'me',
  'my', 'our', 'we', 'you', 'clinical', 'trial', 'trials', 'study', 'studies'
]);

/**
 * Build an optimized ClinicalTrials.gov query
 */
export function buildOptimizedQuery(rawInput: string): {
  primary: string;
  fallback: string;
  suggestions: AutocompleteSuggestion[];
} {
  const input = rawInput.trim();
  if (!input) {
    return { primary: '', fallback: '', suggestions: [] };
  }

  // Get expanded query with medical term matching
  const expanded = expandSearchQuery(input);

  // Get autocomplete suggestions for the UI
  const suggestions = getAutocompleteSuggestions(input);

  // Primary query: precise matching
  const primary = expanded.ctgovQuery;

  // Fallback query: broader matching
  const fallback = expanded.ctgovLooseQuery;

  return { primary, fallback, suggestions };
}

/**
 * Extract condition and location from natural language query
 */
export function parseNaturalLanguageQuery(input: string): {
  condition: string;
  location: string;
  modifiers: string[];
} {
  let text = input.trim();
  let location = '';
  const modifiers: string[] = [];

  // Extract location patterns
  const locationPatterns = [
    /\b(?:in|near|around|within|close to)\s+(.+?)(?:\s*,\s*|\s+(?:for|with|and)|$)/i,
    /,\s*([A-Za-z\s]+(?:,\s*[A-Z]{2})?)$/i
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      location = match[1].trim();
      text = text.replace(pattern, ' ').trim();
      break;
    }
  }

  // Extract modifiers (stage, phase, status)
  const modifierPatterns = [
    { pattern: /\b(stage\s*(?:i{1,3}v?|[1-4]))\b/gi, type: 'stage' },
    { pattern: /\b(phase\s*(?:i{1,3}v?|[1-4]))\b/gi, type: 'phase' },
    { pattern: /\b(recruiting|active|completed|enrolling)\b/gi, type: 'status' },
    { pattern: /\b(metastatic|advanced|early stage|late stage)\b/gi, type: 'modifier' },
    { pattern: /\b(adult|pediatric|children|elderly)\b/gi, type: 'population' }
  ];

  for (const { pattern } of modifierPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      modifiers.push(...matches.map(m => m.toLowerCase()));
      text = text.replace(pattern, ' ').trim();
    }
  }

  // Clean up the condition
  const condition = text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'-]/g, '')
    .trim();

  return { condition, location, modifiers };
}

// ============================================================================
// RELEVANCE SCORING
// ============================================================================

export interface ScoredResult<T> {
  item: T;
  score: number;
  breakdown: {
    termMatch: number;
    recency: number;
    status: number;
    location: number;
  };
}

/**
 * Score search results for relevance ranking
 */
export function scoreSearchResult(
  study: {
    title?: string;
    conditions?: string[];
    status?: string;
    startDate?: string;
    locations?: Array<{ city?: string; state?: string; country?: string }>;
  },
  query: string,
  userLocation?: { lat: number; lng: number }
): number {
  const expanded = expandSearchQuery(query);
  let score = 0;

  // Term matching (0-50 points)
  const titleLower = (study.title || '').toLowerCase();
  const conditionsLower = (study.conditions || []).map(c => c.toLowerCase());

  for (const match of expanded.matches) {
    const termLower = match.term.canonical.toLowerCase();

    // Exact condition match
    if (conditionsLower.some(c => c.includes(termLower))) {
      score += 30 * match.score;
    }

    // Title match
    if (titleLower.includes(termLower)) {
      score += 20 * match.score;
    }

    // Synonym match in conditions
    for (const syn of match.term.synonyms) {
      if (conditionsLower.some(c => c.includes(syn.toLowerCase()))) {
        score += 15 * match.score;
        break;
      }
    }
  }

  // Status scoring (0-25 points)
  const statusScores: Record<string, number> = {
    'RECRUITING': 25,
    'ENROLLING_BY_INVITATION': 20,
    'ACTIVE_NOT_RECRUITING': 15,
    'NOT_YET_RECRUITING': 10,
    'COMPLETED': 5,
    'SUSPENDED': 2,
    'TERMINATED': 1,
    'WITHDRAWN': 0
  };
  score += statusScores[(study.status || '').toUpperCase()] || 0;

  // Recency scoring (0-15 points)
  if (study.startDate) {
    const startYear = parseInt(study.startDate.split('-')[0] || '0', 10);
    const currentYear = new Date().getFullYear();
    const yearsAgo = currentYear - startYear;
    if (yearsAgo <= 1) score += 15;
    else if (yearsAgo <= 2) score += 12;
    else if (yearsAgo <= 3) score += 8;
    else if (yearsAgo <= 5) score += 4;
  }

  // Location scoring would require geocoding - placeholder
  // This would be implemented with actual distance calculation

  return Math.min(100, Math.max(0, score));
}
