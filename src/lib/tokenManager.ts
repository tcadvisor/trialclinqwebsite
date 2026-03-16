/**
 * Secure Token Manager
 * Stores OAuth tokens in memory instead of localStorage for better security
 * Tokens are cleared when the page is refreshed or closed
 *
 * SECURITY NOTE: For production applications, consider:
 * 1. Using httpOnly cookies set by the backend
 * 2. Implementing token refresh mechanisms
 * 3. Using secure backend session management
 */

export interface TokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  patient?: string;
  scope?: string;
  expiresAt?: number; // Timestamp when token expires
}

export interface EpicPatientData {
  patientId: string;
  patientData: any;
  profileData?: Record<string, { value: any; source: string; syncedAt: string }>;
  syncedAt: string;
  syncedAtDisplay: string;
}

// In-memory token storage (cleared on page refresh)
let epicTokens: TokenData | null = null;
let epicPatientData: EpicPatientData | null = null;

/**
 * Store EPIC OAuth tokens in memory
 */
export function setEpicTokens(tokens: TokenData): void {
  // Calculate expiration timestamp
  const expiresAt = Date.now() + (tokens.expires_in * 1000);
  epicTokens = { ...tokens, expiresAt };
  console.log('EPIC tokens stored in memory (secure)');
}

/**
 * Get EPIC OAuth tokens from memory
 */
export function getEpicTokens(): TokenData | null {
  if (!epicTokens) {
    return null;
  }

  // Check if token is expired
  if (epicTokens.expiresAt && Date.now() >= epicTokens.expiresAt) {
    console.warn('EPIC token has expired');
    clearEpicTokens();
    return null;
  }

  return epicTokens;
}

/**
 * Clear EPIC tokens from memory
 */
export function clearEpicTokens(): void {
  epicTokens = null;
  console.log('EPIC tokens cleared from memory');
}

/**
 * Store EPIC patient data in memory
 */
export function setEpicPatientData(data: EpicPatientData): void {
  epicPatientData = data;
  console.log('EPIC patient data stored in memory (secure)');
}

/**
 * Get EPIC patient data from memory
 */
export function getEpicPatientData(): EpicPatientData | null {
  return epicPatientData;
}

/**
 * Clear EPIC patient data from memory
 */
export function clearEpicPatientData(): void {
  epicPatientData = null;
  console.log('EPIC patient data cleared from memory');
}

/**
 * Clear all EPIC data from memory
 */
export function clearAllEpicData(): void {
  clearEpicTokens();
  clearEpicPatientData();
}

/**
 * Check if user has valid EPIC tokens
 */
export function hasValidEpicTokens(): boolean {
  const tokens = getEpicTokens();
  return tokens !== null;
}

/**
 * Migration utility: Remove old insecure localStorage data
 * Call this on app initialization to clean up old data
 */
export function migrateFromLocalStorage(): void {
  const oldKeys = [
    'epic:tokens:v1',
    'epic:patient:v1',
    'epic_code_verifier',
    'epic_state'
  ];

  let migrated = false;
  oldKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      migrated = true;
    }
  });

  if (migrated) {
    console.log('Migrated and removed insecure EPIC data from localStorage');
  }
}
