// Storage API utilities for Azure backend

const API_BASE = '/.netlify/functions';

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
  const response = await fetch(`${API_BASE}/profile-write`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save profile');
  }

  console.log('✅ Profile saved to persistent storage');
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

  const response = await fetch(`${API_BASE}/upload-file`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload files');
  }

  const result = await response.json();
  console.log('✅ Files uploaded successfully:', result.files);
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
  console.log('✅ Patient files retrieved:', result.files);
  return result.files;
}

// Cache patient data locally (for offline support)
export function cacheProfileLocally(profile: HealthProfile): void {
  localStorage.setItem('tc_health_profile_v1', JSON.stringify(profile));
  localStorage.setItem('tc_profile_sync_time', new Date().toISOString());
}

// Retrieve cached profile
export function getCachedProfile(patientId: string): HealthProfile | null {
  try {
    const cached = localStorage.getItem('tc_health_profile_v1');
    if (cached) {
      const profile = JSON.parse(cached);
      if (profile.patientId === patientId) {
        return profile;
      }
    }
  } catch (error) {
    console.error('Error reading cached profile:', error);
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
