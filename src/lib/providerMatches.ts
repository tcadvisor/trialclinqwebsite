export type MatchedVolunteer = {
  id: string;
  code: string;
  title: string;
};

const KEY_PREFIX = "provider:matches:v1:";
const API_BASE = "/.netlify/functions/provider-matches";

function getStorageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

// localStorage serves as a fast cache; the DB is the source of truth
function readCache(userId: string): MatchedVolunteer[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as MatchedVolunteer[]) : [];
  } catch {
    return [];
  }
}

function writeCache(userId: string, list: MatchedVolunteer[]): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(list));
    window.dispatchEvent(new StorageEvent("storage", { key: getStorageKey(userId) }));
  } catch {}
}

// fetch from server and backfill localStorage
async function fetchFromServer(userId: string): Promise<MatchedVolunteer[]> {
  try {
    const res = await fetch(API_BASE, {
      headers: { "x-user-id": userId },
    });
    if (!res.ok) return readCache(userId);
    const data = await res.json();
    if (data.ok && Array.isArray(data.volunteers)) {
      writeCache(userId, data.volunteers);
      return data.volunteers;
    }
  } catch {}
  return readCache(userId);
}

export function getMatchedVolunteers(userId: string): MatchedVolunteer[] {
  // return cache immediately; caller can await the async version for fresh data
  return readCache(userId);
}

export async function getMatchedVolunteersAsync(userId: string): Promise<MatchedVolunteer[]> {
  return fetchFromServer(userId);
}

export async function addMatchedVolunteer(userId: string, volunteer: MatchedVolunteer): Promise<void> {
  // optimistic local update
  const list = readCache(userId);
  list.push(volunteer);
  writeCache(userId, list);

  // persist to DB
  try {
    await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify(volunteer),
    });
  } catch (err) {
    console.warn("Failed to persist matched volunteer to server:", err);
  }
}

export async function removeMatchedVolunteer(userId: string, volunteerId: string): Promise<void> {
  // optimistic local update
  const list = readCache(userId);
  writeCache(userId, list.filter((v) => v.id !== volunteerId));

  // persist to DB
  try {
    await fetch(`${API_BASE}?volunteerId=${encodeURIComponent(volunteerId)}`, {
      method: "DELETE",
      headers: { "x-user-id": userId },
    });
  } catch (err) {
    console.warn("Failed to remove matched volunteer from server:", err);
  }
}
