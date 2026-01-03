/**
 * Patient ID utility functions
 * Generates consistent, unique patient IDs based on Azure OID
 * Patient ID must match user.userId (which is derived from Azure OID)
 * for backend authorization to work correctly
 */

import type { User } from './auth';

/**
 * Generate a unique patient ID from user information
 * Uses the user's ID (which contains the Azure OID) for authorization compatibility
 * The backend's canAccessPatient check expects: authenticatedUser.userId === targetPatientId
 *
 * @param user - The authenticated user
 * @returns The patient ID (should match the user's Azure OID)
 */
export function generatePatientId(user: User | null | undefined): string {
  if (!user) {
    console.warn('⚠️ Unable to generate patient ID: user missing');
    return '';
  }

  if (!user.userId) {
    console.warn('⚠️ Unable to generate patient ID: user.userId missing');
    // Fallback to email-based ID if userId is not available
    const emailPrefix = (user.email || '').split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');
    return emailPrefix ? `pat-${emailPrefix}` : '';
  }

  // Use the user's ID directly (which is the Azure OID)
  // This ensures the frontend patientId matches what the backend expects
  const patientId = user.userId;

  console.log('✅ Generated patient ID from user:', { email: user.email, patientId });
  return patientId;
}

/**
 * Validate that a patient ID matches the authenticated user
 * Ensures data integrity and prevents unauthorized access
 *
 * @param patientId - The patient ID to validate
 * @param user - The authenticated user
 * @returns true if the patient ID belongs to this user
 */
export function isValidPatientIdForUser(patientId: string, user: User | null | undefined): boolean {
  if (!user) return false;

  const expectedPatientId = generatePatientId(user);
  return patientId === expectedPatientId && patientId !== '';
}

/**
 * Validate that a health profile belongs to the authenticated user
 * Checks both email and patientId for comprehensive security
 *
 * @param profile - The health profile to validate
 * @param user - The authenticated user
 * @returns true if the profile belongs to this user
 */
export function isValidProfileForUser(
  profile: { email?: string; patientId?: string } | null | undefined,
  user: User | null | undefined
): boolean {
  if (!user || !profile) return false;

  const expectedPatientId = generatePatientId(user);
  const normalizeEmail = (email?: string) => (email || '').trim().toLowerCase();

  const emailMatches = normalizeEmail(profile.email) === normalizeEmail(user.email);
  const patientIdMatches = profile.patientId === expectedPatientId;

  // Both must match for the profile to be valid
  return emailMatches && patientIdMatches;
}

/**
 * Clear all patient-scoped data from localStorage
 * Used when user signs out or when data mismatch is detected
 */
export function clearAllPatientData(): void {
  console.log('🧹 Clearing all patient-scoped data');

  try {
    localStorage.removeItem('tc_health_profile_v1');
    localStorage.removeItem('tc_health_profile_metadata_v1');
    localStorage.removeItem('tc_docs');
    localStorage.removeItem('tc_eligibility_profile');
    localStorage.removeItem('epic:patient:v1');
    localStorage.removeItem('epic:tokens:v1');
  } catch (error) {
    console.error('Error clearing patient data:', error);
  }
}
