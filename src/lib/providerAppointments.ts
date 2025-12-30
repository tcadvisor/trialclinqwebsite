export type Appointment = {
  id: string;
  title: string;
  time: string;
  location: string;
};

const KEY_PREFIX = "provider:appointments:v1:";

function getStorageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function read(userId: string): Appointment[] {
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Appointment[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string, list: Appointment[]): void {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    // ignore
  }
}

export function getAppointments(userId: string): Appointment[] {
  return read(userId);
}

export function addAppointment(userId: string, appointment: Appointment): void {
  const list = read(userId);
  list.push(appointment);
  write(userId, list);
}

export function removeAppointment(userId: string, appointmentId: string): void {
  const list = read(userId);
  write(userId, list.filter((a) => a.id !== appointmentId));
}
