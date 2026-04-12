// Storage API utilities for Azure backend
// Uses PostgreSQL for persistent storage with localStorage as fallback

import { setEncryptedItem, getEncryptedItem } from './encryption';
import { addCsrfHeader, getCsrfToken } from './csrf';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const USER_DATA_API = '/api/user-data';

// ============================================================================
// NEW: Server-side storage functions (work in incognito mode!)
// ============================================================================

/**
 * Save health profile to server (PostgreSQL)
 * Falls back to localStorage if server unavailable
 */
export async function saveHealthProfileToServer(profile: any): Promise<boolean> {
  try {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${USER_DATA_API}/health-profile`, {
      credentials: "include",
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      },
      credentials: 'include', // Important: sends httpOnly cookie
      body: JSON.stringify(profile),
    });

    if (response.ok) {
      // Also cache locally for offline access
      await cacheProfileLocally(profile);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Failed to save to server, using localStorage fallback:', error);
    await cacheProfileLocally(profile);
    return false;
  }
}

/**
 * Load health profile from server (PostgreSQL)
 * Falls back to localStorage if server unavailable
 */
export async function loadHealthProfileFromServer(): Promise<any | null> {
  try {
    const response = await fetch(`${USER_DATA_API}/health-profile`, {
      credentials: "include",
      method: 'GET',
      credentials: 'include', // Important: sends httpOnly cookie
    });

    if (response.ok) {
      const data = await response.json();
      if (data.profile) {
        // Cache locally for offline access
        await cacheProfileLocally(data.profile);
        return data.profile;
      }
    }
  } catch (error) {
    console.warn('Failed to load from server, trying localStorage:', error);
  }

  // Fallback to localStorage
  try {
    return await getEncryptedItem('tc_health_profile_v1');
  } catch {
    return null;
  }
}

/**
 * Save user preferences to server (PostgreSQL)
 */
export async function savePreferencesToServer(prefs: {
  notifyEmail?: boolean;
  notifyTrials?: boolean;
  notifyNews?: boolean;
  consent?: Record<string, boolean>;
}): Promise<boolean> {
  try {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${USER_DATA_API}/preferences`, {
      credentials: "include",
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify(prefs),
    });

    if (response.ok) {
      // Also cache locally
      if (prefs.notifyEmail !== undefined) localStorage.setItem('tc_notify_email', JSON.stringify(prefs.notifyEmail));
      if (prefs.notifyTrials !== undefined) localStorage.setItem('tc_notify_trials', JSON.stringify(prefs.notifyTrials));
      if (prefs.notifyNews !== undefined) localStorage.setItem('tc_notify_news', JSON.stringify(prefs.notifyNews));
      if (prefs.consent) localStorage.setItem('tc_consent', JSON.stringify(prefs.consent));
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Failed to save preferences to server:', error);
    // Save to localStorage as fallback
    if (prefs.notifyEmail !== undefined) localStorage.setItem('tc_notify_email', JSON.stringify(prefs.notifyEmail));
    if (prefs.notifyTrials !== undefined) localStorage.setItem('tc_notify_trials', JSON.stringify(prefs.notifyTrials));
    if (prefs.notifyNews !== undefined) localStorage.setItem('tc_notify_news', JSON.stringify(prefs.notifyNews));
    if (prefs.consent) localStorage.setItem('tc_consent', JSON.stringify(prefs.consent));
    return false;
  }
}

/**
 * Load user preferences from server (PostgreSQL)
 */
export async function loadPreferencesFromServer(): Promise<{
  notifyEmail?: boolean;
  notifyTrials?: boolean;
  notifyNews?: boolean;
  consent?: Record<string, boolean>;
} | null> {
  try {
    const response = await fetch(`${USER_DATA_API}/preferences`, {
      credentials: "include",
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.preferences) {
        // Cache locally
        if (data.preferences.notifyEmail !== undefined) localStorage.setItem('tc_notify_email', JSON.stringify(data.preferences.notifyEmail));
        if (data.preferences.notifyTrials !== undefined) localStorage.setItem('tc_notify_trials', JSON.stringify(data.preferences.notifyTrials));
        if (data.preferences.notifyNews !== undefined) localStorage.setItem('tc_notify_news', JSON.stringify(data.preferences.notifyNews));
        if (data.preferences.consent) localStorage.setItem('tc_consent', JSON.stringify(data.preferences.consent));
        return data.preferences;
      }
    }
  } catch (error) {
    console.warn('Failed to load preferences from server:', error);
  }

  // Fallback to localStorage
  try {
    return {
      notifyEmail: JSON.parse(localStorage.getItem('tc_notify_email') || 'true'),
      notifyTrials: JSON.parse(localStorage.getItem('tc_notify_trials') || 'true'),
      notifyNews: JSON.parse(localStorage.getItem('tc_notify_news') || 'false'),
      consent: JSON.parse(localStorage.getItem('tc_consent') || '{}'),
    };
  } catch {
    return null;
  }
}

/**
 * Save eligibility data to server (PostgreSQL)
 */
export async function saveEligibilityToServer(eligibility: {
  dob?: string;
  age?: number;
  weight?: number;
  gender?: string;
  race?: string;
  language?: string;
  loc?: string;
  radius?: string;
}): Promise<boolean> {
  try {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${USER_DATA_API}/eligibility`, {
      credentials: "include",
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify(eligibility),
    });

    if (response.ok) {
      // Also cache locally
      localStorage.setItem('tc_eligibility_profile', JSON.stringify(eligibility));
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Failed to save eligibility to server:', error);
    localStorage.setItem('tc_eligibility_profile', JSON.stringify(eligibility));
    return false;
  }
}

/**
 * Load eligibility data from server (PostgreSQL)
 */
export async function loadEligibilityFromServer(): Promise<any | null> {
  try {
    const response = await fetch(`${USER_DATA_API}/eligibility`, {
      credentials: "include",
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.eligibility) {
        localStorage.setItem('tc_eligibility_profile', JSON.stringify(data.eligibility));
        return data.eligibility;
      }
    }
  } catch (error) {
    console.warn('Failed to load eligibility from server:', error);
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem('tc_eligibility_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Load all user data from server at once (efficient for initial load)
 */
export async function loadAllUserDataFromServer(): Promise<{
  healthProfile?: any;
  preferences?: any;
  eligibility?: any;
} | null> {
  try {
    const response = await fetch(`${USER_DATA_API}/all`, {
      credentials: "include",
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      // Cache everything locally
      if (data.healthProfile) {
        await cacheProfileLocally(data.healthProfile);
      }
      if (data.preferences) {
        if (data.preferences.notifyEmail !== undefined) localStorage.setItem('tc_notify_email', JSON.stringify(data.preferences.notifyEmail));
        if (data.preferences.notifyTrials !== undefined) localStorage.setItem('tc_notify_trials', JSON.stringify(data.preferences.notifyTrials));
        if (data.preferences.notifyNews !== undefined) localStorage.setItem('tc_notify_news', JSON.stringify(data.preferences.notifyNews));
        if (data.preferences.consent) localStorage.setItem('tc_consent', JSON.stringify(data.preferences.consent));
      }
      if (data.eligibility) {
        localStorage.setItem('tc_eligibility_profile', JSON.stringify(data.eligibility));
      }
      return data;
    }
  } catch (error) {
    console.warn('Failed to load all user data from server:', error);
  }
  return null;
}

// ============================================================================
// Original functions (localStorage-based, kept for backwards compatibility)
// ============================================================================

interface HealthProfile {
  patientId: string;
  email: string;
  emailVerified?: boolean;
  age?: string;
  weight?: string;
  phone?: string;
  gender?: string;
  race?: string;
  language?: string;
  bloodGroup?: string;
  genotype?: string;
  hearingImpaired?: boolean;
  visionImpaired?: boolean;
  primaryCondition?: string;
  diagnosed?: string;
  allergies?: any[];
  medications?: any[];
  additionalInfo?: string;
  additionalInformationAppendMarkdown?: string;
  ecog?: string;
  diseaseStage?: string;
  biomarkers?: string;
  priorTherapies?: any[];
  comorbidityCardiac?: boolean;
  comorbidityRenal?: boolean;
  comorbidityHepatic?: boolean;
  comorbidityAutoimmune?: boolean;
  infectionHIV?: boolean;
  infectionHBV?: boolean;
  infectionHCV?: boolean;
}

interface PatientFile {
  id: number;
  name: string;
  size: number;
  uploadedAt: string;
  url: string;
}

function toAuthHeader(token?: string): string {
  const raw = (token || "").trim();
  if (!raw) throw new Error("Not authenticated. Please sign in and try again.");
  return raw.toLowerCase().startsWith("bearer ") ? raw : `Bearer ${raw}`;
}

// Save patient profile to persistent storage
export async function savePatientProfile(profile: HealthProfile, authToken?: string): Promise<void> {
  const authHeader = toAuthHeader(authToken);
  const headers = await addCsrfHeader({
    'Content-Type': 'application/json',
    'Authorization': authHeader,
  });

  const response = await fetch(`${API_BASE}/profile-write`, {
      credentials: "include",
    method: 'POST',
    headers,
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save profile');
  }

  return response.json();
}

// Upload files to Azure Blob Storage
export async function uploadPatientFiles(
  patientId: string,
  files: File[],
  authToken?: string
): Promise<any[]> {
  const authHeader = toAuthHeader(authToken);
  const formData = new FormData();
  formData.append('patientId', patientId);

  files.forEach((file) => {
    formData.append('files', file);
  });

  const headers = await addCsrfHeader({
    'Authorization': authHeader,
  });

  const response = await fetch(`${API_BASE}/upload-file`, {
      credentials: "include",
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload files');
  }

  const result = await response.json();
  return result.files;
}

// Get patient files from Azure Blob Storage
export async function getPatientFiles(patientId: string, authToken?: string): Promise<PatientFile[]> {
  const authHeader = toAuthHeader(authToken);
  const response = await fetch(`${API_BASE}/get-patient-files?patientId=${encodeURIComponent(patientId)}`, {
      credentials: "include",
    method: 'GET',
    headers: {
      'Authorization': authHeader,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch files');
  }

  const result = await response.json();
  return result.files;
}

// Cache patient data locally (for offline support) - NOW ENCRYPTED
export async function cacheProfileLocally(profile: HealthProfile): Promise<void> {
  try {
    await setEncryptedItem('tc_health_profile_v1', profile);
    localStorage.setItem('tc_profile_sync_time', new Date().toISOString());
  } catch (error) {
    throw error;
  }
}

// Retrieve cached profile - NOW DECRYPTS DATA
export async function getCachedProfile(patientId: string): Promise<HealthProfile | null> {
  try {
    const profile = await getEncryptedItem<HealthProfile>('tc_health_profile_v1');
    if (profile && profile.patientId === patientId) {
      return profile;
    }
  } catch (error) {
    // Error reading cached profile
  }
  return null;
}

// Check if profile needs syncing
export function shouldSyncProfile(): boolean {
  const lastSync = localStorage.getItem('tc_profile_sync_time');
  if (!lastSync) return true;

  const lastSyncTime = new Date(lastSync).getTime();
  const now = new Date().getTime();
  const hourInMs = 60 * 60 * 1000;

  return now - lastSyncTime > hourInMs;
}

// Clear local cache
export function clearLocalCache(): void {
  localStorage.removeItem('tc_health_profile_v1');
  localStorage.removeItem('tc_profile_sync_time');
  localStorage.removeItem('tc_docs');
}

interface ProviderProfile {
  providerId: string;
  email: string;
  emailVerified?: boolean;
  siteName?: string;
  organization?: string;
  organizationType?: string;
  organizationAbbreviation?: string;
  parentOrganizations?: string[];
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  facilityType?: string;
  fundingOrganization?: string;
  acceptedConditions?: string[];
  languages?: string[];
  investigatorName?: string;
  investigatorPhone?: string;
  investigatorEmail?: string;
  affiliatedOrganization?: string;
  regulatoryAuthority?: string;
  regulatoryAuthorityAddress?: string;
  consentsAccepted?: Record<string, boolean>;
  additionalInfo?: string;
}

// Save provider profile to persistent storage
export async function saveProviderProfile(profile: ProviderProfile, authToken?: string): Promise<void> {
  const authHeader = toAuthHeader(authToken);
  const headers = await addCsrfHeader({
    'Content-Type': 'application/json',
    'Authorization': authHeader,
  });

  const response = await fetch(`${API_BASE}/provider-write`, {
      credentials: "include",
    method: 'POST',
    headers,
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save provider profile');
  }

  return response.json();
}

// Cache provider profile locally - NOW ENCRYPTED
export async function cacheProviderProfileLocally(profile: ProviderProfile): Promise<void> {
  try {
    await setEncryptedItem('tc_provider_profile_v1', profile);
    localStorage.setItem('tc_provider_sync_time', new Date().toISOString());
  } catch (error) {
    throw error;
  }
}

// Retrieve cached provider profile - NOW DECRYPTS DATA
export async function getCachedProviderProfile(providerId: string): Promise<ProviderProfile | null> {
  try {
    const profile = await getEncryptedItem<ProviderProfile>('tc_provider_profile_v1');
    if (profile && profile.providerId === providerId) {
      return profile;
    }
  } catch (error) {
    // Error reading cached provider profile
  }
  return null;
}
