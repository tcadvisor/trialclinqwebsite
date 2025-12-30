export type AddedTrial = {
  nctId: string;
  title: string;
  status?: string;
  sponsor?: string;
  nearest?: string;
};

const KEY_PREFIX = "provider:trials:v1:";

function getStorageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function read(userId: string): AddedTrial[] {
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

function write(userId: string, list: AddedTrial[]): void {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    // ignore
  }
}

export function getAddedTrials(userId: string): AddedTrial[] {
  return read(userId);
}

export function isTrialAdded(userId: string, nctId: string): boolean {
  const id = nctId.trim().toUpperCase();
  return read(userId).some((t) => (t.nctId || "").trim().toUpperCase() === id);
}

export function addTrial(userId: string, trial: AddedTrial): void {
  const list = read(userId);
  const id = trial.nctId.trim().toUpperCase();
  const exists = list.findIndex((t) => (t.nctId || "").trim().toUpperCase() === id);
  if (exists >= 0) {
    list[exists] = { ...list[exists], ...trial };
  } else {
    list.unshift({ ...trial, nctId: id });
  }
  write(userId, list);
}

export function removeTrial(userId: string, nctId: string): void {
  const id = nctId.trim().toUpperCase();
  write(userId, read(userId).filter((t) => (t.nctId || "").trim().toUpperCase() !== id));
}
