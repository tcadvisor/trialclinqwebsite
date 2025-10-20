/**
 * Format study status API values into human-readable labels
 */
export function formatStudyStatus(status: string): string {
  const mapping: Record<string, string> = {
    RECRUITING: 'Recruiting',
    ACTIVE_NOT_RECRUITING: 'Active (Not Recruiting)',
    COMPLETED: 'Completed',
    NOT_YET_RECRUITING: 'Not Yet Recruiting',
    ENROLLING_BY_INVITATION: 'Enrolling by Invitation',
    SUSPENDED: 'Suspended',
    TERMINATED: 'Terminated',
    WITHDRAWN: 'Withdrawn',
    UNKNOWN: 'Unknown',
  };

  return mapping[status] || status;
}

/**
 * Format study type API values into human-readable labels
 */
export function formatStudyType(type: string): string {
  const mapping: Record<string, string> = {
    INTERVENTIONAL: 'Interventional',
    OBSERVATIONAL: 'Observational',
    EXPANDED_ACCESS: 'Expanded Access',
  };

  return mapping[type] || type;
}

/**
 * Format page size display
 */
export function formatPageSize(size: number): string {
  return `${size} per page`;
}

/**
 * Format trial phase API values into human-readable labels
 */
export function formatPhase(phase: string): string {
  if (!phase) return '';

  const mapping: Record<string, string> = {
    'PHASE1': 'Phase 1',
    'PHASE2': 'Phase 2',
    'PHASE3': 'Phase 3',
    'PHASE4': 'Phase 4',
    'PHASE1/PHASE2': 'Phase 1/2',
    'PHASE2/PHASE3': 'Phase 2/3',
  };

  // Check exact matches first
  const normalized = phase.replace(/\s+/g, '').toUpperCase();
  if (mapping[normalized]) return mapping[normalized];

  // If it's already formatted nicely (e.g., "Phase 2"), return as-is
  if (/^Phase\s+\d/.test(phase)) return phase;

  // Otherwise capitalize it nicely
  return phase
    .split(/\s*\/\s*/)
    .map((p) => {
      const trimmed = p.trim();
      if (/^phase/i.test(trimmed)) return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
      if (/^\d+/.test(trimmed)) return `Phase ${trimmed}`;
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    })
    .join('/');
}
