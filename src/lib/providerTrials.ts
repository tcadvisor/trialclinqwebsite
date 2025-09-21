export type AddedTrial = {
  nctId: string;
  title: string;
  status?: string;
  sponsor?: string;
  nearest?: string;
};

const KEY = "provider:trials:v1";

function read(): AddedTrial[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as AddedTrial[]) : [];
  } catch {
    return [];
  }
}

function write(list: AddedTrial[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
  } catch {
    // ignore
  }
}

export function getAddedTrials(): AddedTrial[] {
  return read();
}

export function isTrialAdded(nctId: string): boolean {
  const id = nctId.trim().toUpperCase();
  return read().some((t) => (t.nctId || "").trim().toUpperCase() === id);
}

export function addTrial(trial: AddedTrial): void {
  const list = read();
  const id = trial.nctId.trim().toUpperCase();
  const exists = list.findIndex((t) => (t.nctId || "").trim().toUpperCase() === id);
  if (exists >= 0) {
    list[exists] = { ...list[exists], ...trial };
  } else {
    list.unshift({ ...trial, nctId: id });
  }
  write(list);
}

export function removeTrial(nctId: string): void {
  const id = nctId.trim().toUpperCase();
  write(read().filter((t) => (t.nctId || "").trim().toUpperCase() !== id));
}
