// Storage API utilities for Azure backend

import { setEncryptedItem, getEncryptedItem } from './encryption';
import { addCsrfHeader } from './csrf';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
