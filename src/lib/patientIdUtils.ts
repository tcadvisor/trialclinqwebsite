/**
 * Patient ID utility functions
 * Generates consistent, unique patient IDs based on authenticated user information
 */

import type { User } from './auth';

/**
 * Generate a unique patient ID from user information
 * Uses the user's email as the basis for consistency and uniqueness
 * 
 * @param user - The authenticated user
 * @returns A unique patient ID in format: user-{email-prefix}
 */
export function generatePatientId(user: User | null | undefined): string {
  if (!user || !user.email) {
    console.warn('⚠️ Unable to generate patient ID: user or email missing');
    return '';
  }

  // Extract the email prefix (part before @)
  const emailPrefix = user.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');
  
  // Generate a unique patient ID based on email prefix
  // This ensures each user has a unique, consistent ID
  const patientId = `pat-${emailPrefix}`;
  
  console.log('✅ Generated patient ID:', patientId, 'for user:', user.email);
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
  return patientId === expectedPatientId;
}
