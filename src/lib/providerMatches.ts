export type MatchedVolunteer = {
  id: string;
  code: string;
  title: string;
};

const KEY_PREFIX = "provider:matches:v1:";

function getStorageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function read(userId: string): MatchedVolunteer[] {
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as MatchedVolunteer[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string, list: MatchedVolunteer[]): void {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    // ignore
  }
}

export function getMatchedVolunteers(userId: string): MatchedVolunteer[] {
  return read(userId);
}

export function addMatchedVolunteer(userId: string, volunteer: MatchedVolunteer): void {
  const list = read(userId);
  list.push(volunteer);
  write(userId, list);
}

export function removeMatchedVolunteer(userId: string, volunteerId: string): void {
  const list = read(userId);
  write(userId, list.filter((v) => v.id !== volunteerId));
}
