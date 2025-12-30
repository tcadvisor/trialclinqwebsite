/**
 * Provider ID utility functions
 * Generates consistent, unique provider IDs based on Azure OID
 * Mirrors the patient ID generation pattern for consistency
 */

import type { User } from './auth';

/**
 * Generate a unique provider ID from user information
 * Uses the user's ID (which contains the Azure OID) for authorization compatibility
 * The backend's authorization checks expect: authenticatedUser.userId === targetProviderId
 *
 * @param user - The authenticated user
 * @returns The provider ID (should match the user's Azure OID)
 */
export function generateProviderId(user: User | null | undefined): string {
  if (!user) {
    console.warn('⚠️ Unable to generate provider ID: user missing');
    return '';
  }

  if (!user.userId) {
    console.warn('⚠️ Unable to generate provider ID: user.userId missing');
    return '';
  }

  // Use the user's ID directly (which is the Azure OID)
  // This ensures the frontend providerId matches what the backend expects
  const providerId = user.userId;

  console.log('✅ Generated provider ID from user:', { email: user.email, providerId });
  return providerId;
}

/**
 * Validate that a provider ID matches the authenticated user
 * Ensures data integrity and prevents unauthorized access
 *
 * @param providerId - The provider ID to validate
 * @param user - The authenticated user
 * @returns true if the provider ID belongs to this user
 */
export function isValidProviderIdForUser(providerId: string, user: User | null | undefined): boolean {
  if (!user) return false;

  const expectedProviderId = generateProviderId(user);
  return providerId === expectedProviderId && providerId !== '';
}
