// Common medical conditions from ClinicalTrials.gov for spell checking suggestions
const COMMON_CONDITIONS = [
  'Pain', 'Diabetes', 'Hypertension', 'Breast Cancer', 'Lung Cancer', 'Prostate Cancer',
  'Heart Failure', 'Asthma', 'COPD', 'Depression', 'Anxiety', 'Arthritis', 'Osteoporosis',
  'Migraine', 'Headache', 'Alzheimer', 'Parkinson', 'Autism', 'ADHD', 'Obesity',
  'Colorectal Cancer', 'Melanoma', 'Psoriasis', 'Crohn Disease', 'Ulcerative Colitis',
  'Rheumatoid Arthritis', 'Lupus', 'Fibrosis', 'Kidney Disease', 'Liver Disease',
  'Gastroesophageal Reflux', 'Atrial Fibrillation', 'Cholesterol', 'Stroke', 'Epilepsy',
  'Multiple Sclerosis', 'Cerebral Palsy', 'Spinal Cord Injury', 'Burns', 'Wounds',
];

// Levenshtein distance calculation
function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  const matrix: number[][] = [];

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
}

export interface SpellCheckSuggestion {
  original: string;
  suggestion: string;
  distance: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Get spell check suggestions based on edit distance
 * Returns suggestions where the edit distance is small enough to be meaningful
 */
export function getSpellCheckSuggestions(query: string, maxSuggestions = 3): SpellCheckSuggestion[] {
  if (!query || query.length < 2) return [];

  const distances = COMMON_CONDITIONS.map((cond) => ({
    condition: cond,
    distance: levenshteinDistance(query, cond),
  }))
    .filter(({ distance }) => distance > 0 && distance <= Math.max(2, Math.ceil(query.length * 0.3)))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions);

  return distances.map(({ condition, distance }) => {
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (distance === 1) confidence = 'high';
    else if (distance === 2) confidence = 'medium';

    return {
      original: query,
      suggestion: condition,
      distance,
      confidence,
    };
  });
}

/**
 * Placeholder for AI-powered correction — returns null when secure backend scorer is unavailable.
 */
export async function correctWithAI(_query: string): Promise<string | null> {
  return null;
}
