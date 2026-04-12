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

// localStorage is just a read cache — DB is the source of truth
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
    // localStorage unavailable, not a big deal since DB has the data
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
    console.warn("Failed to fetch trials from API, falling back to cache:", error);
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
    console.warn("Failed to add trial via API:", error);
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
    console.warn("Failed to remove trial via API:", error);
    return { ok: false, error: "API unavailable" };
  }
}

// --- Public API ---
// Read: returns cached data instantly. Callers should also call
// getAddedTrialsAsync() on mount to refresh from DB.
export function getAddedTrials(userId: string): AddedTrial[] {
  return readLocal(userId);
}

// Read (async): fetches from DB and updates the cache
export async function getAddedTrialsAsync(userId: string): Promise<AddedTrial[]> {
  const { ok, trials } = await fetchTrialsFromAPI(userId);

  if (ok) {
    writeLocal(userId, trials);
    return trials;
  }

  return trials; // falls back to cached data if API is down
}

export function isTrialAdded(userId: string, nctId: string): boolean {
  const id = nctId.trim().toUpperCase();
  return readLocal(userId).some((t) => (t.nctId || "").trim().toUpperCase() === id);
}

// Write: DB first, then update cache on success
export async function addTrialAsync(userId: string, trial: AddedTrial): Promise<{ ok: boolean; error?: string }> {
  const id = trial.nctId.trim().toUpperCase();

  // Write to DB first — it's the source of truth
  const result = await addTrialToAPI(userId, { ...trial, nctId: id });

  if (!result.ok) {
    // Don't update cache if the DB write failed
    return result;
  }

  // DB succeeded, now update the local cache
  const list = readLocal(userId);
  const exists = list.findIndex((t) => (t.nctId || "").trim().toUpperCase() === id);

  if (exists >= 0) {
    list[exists] = { ...list[exists], ...trial, nctId: id };
  } else {
    list.unshift({ ...trial, nctId: id, addedAt: new Date().toISOString() });
  }
  writeLocal(userId, list);

  return result;
}

// Sync wrapper — just calls through to async version.
// Kept for backward compat, but callers should migrate to addTrialAsync.
export function addTrial(userId: string, trial: AddedTrial): Promise<{ ok: boolean; error?: string }> {
  return addTrialAsync(userId, trial);
}

// Write: DB first, then update cache on success
export async function removeTrialAsync(userId: string, nctId: string): Promise<{ ok: boolean; error?: string }> {
  const id = nctId.trim().toUpperCase();

  const result = await removeTrialFromAPI(userId, id);

  if (!result.ok) {
    return result;
  }

  // DB succeeded, drop it from the cache
  writeLocal(userId, readLocal(userId).filter((t) => (t.nctId || "").trim().toUpperCase() !== id));

  return result;
}

// Sync wrapper — just calls through to async version
export function removeTrial(userId: string, nctId: string): Promise<{ ok: boolean; error?: string }> {
  return removeTrialAsync(userId, nctId);
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
