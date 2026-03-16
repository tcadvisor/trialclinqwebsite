import { addCsrfHeader } from "./csrf";

export type AddedTrial = {
  nctId: string;
  title: string;
  status?: string;
  phase?: string;
  sponsor?: string;
  conditions?: string[];
  nearest?: string;
  enrollmentCount?: number;
  startDate?: string;
  completionDate?: string;
  addedAt?: string;
};

const KEY_PREFIX = "provider:trials:v1:";

function getStorageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

// Local storage helpers for fallback
function readLocal(userId: string): AddedTrial[] {
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as AddedTrial[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(userId: string, list: AddedTrial[]): void {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    // ignore
  }
}

// API helpers
async function fetchTrialsFromAPI(userId: string): Promise<{ ok: boolean; trials: AddedTrial[] }> {
  try {
    const response = await fetch("/api/provider-trials", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-provider-id": userId,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return { ok: true, trials: data.trials || [] };
  } catch (error) {
    console.warn("Failed to fetch trials from API, using local storage:", error);
    return { ok: false, trials: readLocal(userId) };
  }
}

async function addTrialToAPI(
  userId: string,
  trial: AddedTrial
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await addCsrfHeader({
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-provider-id": userId,
    });

    const response = await fetch("/api/provider-trials", {
      method: "POST",
      headers,
      body: JSON.stringify({
        nctId: trial.nctId,
        title: trial.title,
        status: trial.status,
        phase: trial.phase,
        sponsor: trial.sponsor,
        conditions: trial.conditions,
        nearestSite: trial.nearest,
        enrollmentCount: trial.enrollmentCount,
        startDate: trial.startDate,
        completionDate: trial.completionDate,
      }),
    });

    const data = await response.json();
    return { ok: response.ok, error: data.error };
  } catch (error) {
    console.warn("Failed to add trial via API, using local storage:", error);
    return { ok: false, error: "API unavailable" };
  }
}

async function removeTrialFromAPI(
  userId: string,
  nctId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await addCsrfHeader({
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-provider-id": userId,
    });

    const response = await fetch(`/api/provider-trials?nctId=${encodeURIComponent(nctId)}`, {
      method: "DELETE",
      headers,
    });

    const data = await response.json();
    return { ok: response.ok, error: data.error };
  } catch (error) {
    console.warn("Failed to remove trial via API, using local storage:", error);
    return { ok: false, error: "API unavailable" };
  }
}

// Public API - hybrid approach (API first, localStorage fallback)
export async function getAddedTrialsAsync(userId: string): Promise<AddedTrial[]> {
  const { ok, trials } = await fetchTrialsFromAPI(userId);

  if (ok) {
    // Sync to localStorage for offline access
    writeLocal(userId, trials);
    return trials;
  }

  return trials; // Returns localStorage data if API failed
}

// Synchronous version for backward compatibility (uses localStorage)
export function getAddedTrials(userId: string): AddedTrial[] {
  return readLocal(userId);
}

export function isTrialAdded(userId: string, nctId: string): boolean {
  const id = nctId.trim().toUpperCase();
  return readLocal(userId).some((t) => (t.nctId || "").trim().toUpperCase() === id);
}

export async function addTrialAsync(userId: string, trial: AddedTrial): Promise<{ ok: boolean; error?: string }> {
  // Update localStorage immediately for optimistic UI
  const list = readLocal(userId);
  const id = trial.nctId.trim().toUpperCase();
  const exists = list.findIndex((t) => (t.nctId || "").trim().toUpperCase() === id);

  if (exists >= 0) {
    list[exists] = { ...list[exists], ...trial };
  } else {
    list.unshift({ ...trial, nctId: id, addedAt: new Date().toISOString() });
  }
  writeLocal(userId, list);

  // Then sync to API
  const result = await addTrialToAPI(userId, { ...trial, nctId: id });

  if (!result.ok) {
    console.warn("Failed to sync trial to API:", result.error);
  }

  return result;
}

// Synchronous version for backward compatibility
export function addTrial(userId: string, trial: AddedTrial): void {
  const list = readLocal(userId);
  const id = trial.nctId.trim().toUpperCase();
  const exists = list.findIndex((t) => (t.nctId || "").trim().toUpperCase() === id);
  if (exists >= 0) {
    list[exists] = { ...list[exists], ...trial };
  } else {
    list.unshift({ ...trial, nctId: id });
  }
  writeLocal(userId, list);

  // Fire and forget API sync
  addTrialToAPI(userId, { ...trial, nctId: id }).catch(() => {});
}

export async function removeTrialAsync(userId: string, nctId: string): Promise<{ ok: boolean; error?: string }> {
  const id = nctId.trim().toUpperCase();

  // Update localStorage immediately
  writeLocal(userId, readLocal(userId).filter((t) => (t.nctId || "").trim().toUpperCase() !== id));

  // Then sync to API
  return removeTrialFromAPI(userId, id);
}

// Synchronous version for backward compatibility
export function removeTrial(userId: string, nctId: string): void {
  const id = nctId.trim().toUpperCase();
  writeLocal(userId, readLocal(userId).filter((t) => (t.nctId || "").trim().toUpperCase() !== id));

  // Fire and forget API sync
  removeTrialFromAPI(userId, id).catch(() => {});
}

// Hook for React components to sync data
export function useProviderTrialsSync(userId: string): {
  syncTrials: () => Promise<AddedTrial[]>;
  isLoading: boolean;
} {
  let isLoading = false;

  const syncTrials = async (): Promise<AddedTrial[]> => {
    isLoading = true;
    try {
      const trials = await getAddedTrialsAsync(userId);
      return trials;
    } finally {
      isLoading = false;
    }
  };

  return { syncTrials, isLoading };
}
