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
