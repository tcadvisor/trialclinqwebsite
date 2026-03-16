/**
 * Search Ranking Algorithm for Clinical Trials
 * Implements relevance-based scoring and sorting of search results
 */

import type { CtgovStudy } from './ctgov';
import { expandSearchQuery, jaroWinklerSimilarity } from './searchEngine';

// ============================================================================
// RANKING CONFIGURATION
// ============================================================================

// Default weights when no location is provided
const DEFAULT_WEIGHTS = {
  termRelevance: 0.45,    // 45% - How well the study matches the search terms
  statusBoost: 0.30,      // 30% - Recruiting studies get priority
  recency: 0.15,          // 15% - More recent studies rank higher
  locationMatch: 0.05,    // 5%  - Location proximity (minimal without user location)
  completeness: 0.05,     // 5%  - Studies with complete information rank higher
};

// Weights when location IS provided - prioritize location first
const LOCATION_WEIGHTS = {
  locationMatch: 0.40,    // 40% - Location proximity is most important when provided
  termRelevance: 0.30,    // 30% - Still important to match the condition
  statusBoost: 0.20,      // 20% - Recruiting studies get priority
  recency: 0.05,          // 5%  - Less important when searching by location
  completeness: 0.05,     // 5%  - Studies with complete information rank higher
};

// Status scores (higher = more desirable for patients)
const STATUS_SCORES: Record<string, number> = {
  'RECRUITING': 100,
  'ENROLLING_BY_INVITATION': 90,
  'NOT_YET_RECRUITING': 75,
  'ACTIVE_NOT_RECRUITING': 50,
  'COMPLETED': 25,
  'SUSPENDED': 10,
  'TERMINATED': 5,
  'WITHDRAWN': 0,
  'UNKNOWN': 20,
};

// ============================================================================
// TYPES
// ============================================================================

export interface RankedStudy {
  study: CtgovStudy;
  score: number;
  breakdown: {
    termRelevance: number;
    statusBoost: number;
    recency: number;
    locationMatch: number;
    completeness: number;
  };
}

export interface RankingContext {
  query: string;
  location?: string;
  userLat?: number;
  userLng?: number;
  preferRecruiting?: boolean;
}

// ============================================================================
// TERM RELEVANCE SCORING
// ============================================================================

/**
 * Calculate how well a study matches the search terms
 */
function calculateTermRelevance(study: CtgovStudy, query: string): number {
  if (!query.trim()) return 50; // Neutral score for empty query

  const expanded = expandSearchQuery(query);
  const queryLower = query.toLowerCase();

  // Get study text to match against
  const title = (study.protocolSection?.identificationModule?.briefTitle || '').toLowerCase();
  const conditions = (study.protocolSection?.conditionsModule?.conditions || []).map(c => c.toLowerCase());
  const conditionsText = conditions.join(' ');

  let score = 0;

  // Exact match in title (highest value)
  if (title.includes(queryLower)) {
    score += 40;
  }

  // Exact match in conditions
  if (conditions.some(c => c.includes(queryLower))) {
    score += 35;
  }

  // Match expanded terms (synonyms, related terms)
  for (const match of expanded.matches) {
    const termLower = match.term.canonical.toLowerCase();

    // Canonical term match
    if (title.includes(termLower) || conditionsText.includes(termLower)) {
      score += 25 * match.score;
    }

    // Synonym match
    for (const syn of match.term.synonyms) {
      const synLower = syn.toLowerCase().replace(/"/g, '');
      if (title.includes(synLower) || conditionsText.includes(synLower)) {
        score += 15 * match.score;
        break;
      }
    }

    // Abbreviation match
    for (const abbr of match.term.abbreviations) {
      const abbrLower = abbr.toLowerCase();
      if (title.includes(abbrLower) || conditionsText.includes(abbrLower)) {
        score += 10 * match.score;
        break;
      }
    }
  }

  // Fuzzy matching for typo tolerance
  if (score < 30) {
    // Check title similarity
    const titleWords = title.split(/\s+/);
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    for (const qWord of queryWords) {
      for (const tWord of titleWords) {
        const similarity = jaroWinklerSimilarity(qWord, tWord);
        if (similarity > 0.85) {
          score += 10 * similarity;
        }
      }
    }

    // Check condition similarity
    for (const qWord of queryWords) {
      for (const condition of conditions) {
        const similarity = jaroWinklerSimilarity(qWord, condition);
        if (similarity > 0.8) {
          score += 15 * similarity;
        }
      }
    }
  }

  // Normalize to 0-100
  return Math.min(100, Math.max(0, score));
}

// ============================================================================
// STATUS SCORING
// ============================================================================

/**
 * Calculate status-based score
 */
function calculateStatusScore(study: CtgovStudy, preferRecruiting: boolean = true): number {
  const status = (study.protocolSection?.statusModule?.overallStatus || 'UNKNOWN').toUpperCase();
  let score = STATUS_SCORES[status] ?? 20;

  // Extra boost if user explicitly wants recruiting studies
  if (preferRecruiting && status === 'RECRUITING') {
    score = Math.min(100, score + 10);
  }

  return score;
}

// ============================================================================
// RECENCY SCORING
// ============================================================================

/**
 * Calculate recency score based on study start date
 */
function calculateRecencyScore(study: CtgovStudy): number {
  const startDateStr = study.protocolSection?.statusModule?.startDateStruct?.date;

  if (!startDateStr) {
    return 50; // Neutral score if no date
  }

  try {
    // Parse date (format: "YYYY-MM-DD" or "YYYY-MM" or "YYYY")
    const parts = startDateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;
    const day = parts.length > 2 ? parseInt(parts[2], 10) : 1;

    const startDate = new Date(year, month, day);
    const now = new Date();
    const ageInDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    // Scoring: newer studies score higher
    if (ageInDays < 30) return 100;       // Less than 1 month
    if (ageInDays < 90) return 90;        // 1-3 months
    if (ageInDays < 180) return 80;       // 3-6 months
    if (ageInDays < 365) return 70;       // 6-12 months
    if (ageInDays < 730) return 60;       // 1-2 years
    if (ageInDays < 1095) return 50;      // 2-3 years
    if (ageInDays < 1825) return 35;      // 3-5 years
    return 20;                             // 5+ years
  } catch {
    return 50;
  }
}

// ============================================================================
// LOCATION MATCHING
// ============================================================================

/**
 * Calculate location match score
 * Uses simple text matching since we don't have coordinates for all sites
 */
function calculateLocationScore(
  study: CtgovStudy,
  userLocation?: string,
  userLat?: number,
  userLng?: number
): number {
  if (!userLocation && userLat === undefined) {
    return 50; // Neutral score if no user location
  }

  const locations = study.protocolSection?.contactsLocationsModule?.locations || [];

  if (locations.length === 0) {
    return 30; // Low score if study has no location info
  }

  const userLocLower = (userLocation || '').toLowerCase();

  // Extract user location components
  const userParts = userLocLower.split(',').map(p => p.trim());
  const userCity = userParts[0] || '';
  const userState = userParts[1] || '';

  let bestScore = 0;

  for (const loc of locations) {
    const city = (loc.city || '').toLowerCase();
    const state = (loc.state || '').toLowerCase();
    const country = (loc.country || '').toLowerCase();

    let locScore = 0;

    // Country match (minimal, since most searches are US-focused)
    if (country.includes('united states') || country === 'usa') {
      locScore += 10;
    }

    // State match
    if (state && userState) {
      if (state.includes(userState) || userState.includes(state)) {
        locScore += 40;
      } else {
        // Check state abbreviations
        const similarity = jaroWinklerSimilarity(state, userState);
        if (similarity > 0.8) {
          locScore += 30 * similarity;
        }
      }
    }

    // City match (highest value)
    if (city && userCity) {
      if (city === userCity) {
        locScore += 50;
      } else if (city.includes(userCity) || userCity.includes(city)) {
        locScore += 40;
      } else {
        const similarity = jaroWinklerSimilarity(city, userCity);
        if (similarity > 0.8) {
          locScore += 30 * similarity;
        }
      }
    }

    bestScore = Math.max(bestScore, locScore);

    // Early exit if we found a perfect match
    if (bestScore >= 90) break;
  }

  return Math.min(100, bestScore);
}

// ============================================================================
// COMPLETENESS SCORING
// ============================================================================

/**
 * Score study based on data completeness (more complete = easier for users to evaluate)
 */
function calculateCompletenessScore(study: CtgovStudy): number {
  let score = 0;
  const checks = [
    () => !!study.protocolSection?.identificationModule?.briefTitle,
    () => !!study.protocolSection?.identificationModule?.nctId,
    () => (study.protocolSection?.conditionsModule?.conditions?.length || 0) > 0,
    () => !!study.protocolSection?.statusModule?.overallStatus,
    () => (study.protocolSection?.contactsLocationsModule?.locations?.length || 0) > 0,
    () => !!study.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name,
    () => (study.protocolSection?.designModule?.phases?.length || 0) > 0,
    () => !!study.protocolSection?.statusModule?.startDateStruct?.date,
    () => !!study.protocolSection?.eligibilityModule?.minimumAge,
    () => !!study.protocolSection?.eligibilityModule?.maximumAge,
  ];

  for (const check of checks) {
    if (check()) {
      score += 10;
    }
  }

  return score;
}

// ============================================================================
// MAIN RANKING FUNCTION
// ============================================================================

/**
 * Rank and sort studies by relevance
 */
export function rankStudies(
  studies: CtgovStudy[],
  context: RankingContext
): RankedStudy[] {
  const { query, location, userLat, userLng, preferRecruiting = true } = context;

  // Determine which weights to use based on whether location is provided
  const hasLocation = !!(location && location.trim());
  const WEIGHTS = hasLocation ? LOCATION_WEIGHTS : DEFAULT_WEIGHTS;

  const ranked: RankedStudy[] = studies.map(study => {
    const termRelevance = calculateTermRelevance(study, query);
    const statusBoost = calculateStatusScore(study, preferRecruiting);
    const recency = calculateRecencyScore(study);
    const locationMatch = calculateLocationScore(study, location, userLat, userLng);
    const completeness = calculateCompletenessScore(study);

    // Calculate weighted score - location prioritized when provided
    const score =
      termRelevance * WEIGHTS.termRelevance +
      statusBoost * WEIGHTS.statusBoost +
      recency * WEIGHTS.recency +
      locationMatch * WEIGHTS.locationMatch +
      completeness * WEIGHTS.completeness;

    return {
      study,
      score,
      breakdown: {
        termRelevance,
        statusBoost,
        recency,
        locationMatch,
        completeness,
      },
    };
  });

  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}

/**
 * Re-rank existing search results
 * Useful for client-side re-sorting without new API calls
 */
export function reRankStudies(
  rankedStudies: RankedStudy[],
  sortBy: 'relevance' | 'recency' | 'status' | 'location'
): RankedStudy[] {
  const sorted = [...rankedStudies];

  switch (sortBy) {
    case 'relevance':
      sorted.sort((a, b) => b.score - a.score);
      break;
    case 'recency':
      sorted.sort((a, b) => b.breakdown.recency - a.breakdown.recency);
      break;
    case 'status':
      sorted.sort((a, b) => b.breakdown.statusBoost - a.breakdown.statusBoost);
      break;
    case 'location':
      sorted.sort((a, b) => b.breakdown.locationMatch - a.breakdown.locationMatch);
      break;
  }

  return sorted;
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export type SortOption = 'relevance' | 'recency' | 'status' | 'location';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'recency', label: 'Most Recent' },
  { value: 'status', label: 'Recruiting First' },
  { value: 'location', label: 'Nearest First' },
];
