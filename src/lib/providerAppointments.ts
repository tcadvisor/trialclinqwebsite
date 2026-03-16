import { addCsrfHeader } from "./csrf";

export type AppointmentType = "screening" | "follow_up" | "consent" | "treatment" | "assessment" | "other";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export type Appointment = {
  id: string;
  appointmentId?: string;
  providerId?: string;
  patientId?: string;
  patientEmail?: string;
  patientName?: string;
  nctId?: string;
  trialTitle?: string;
  title: string;
  description?: string;
  appointmentType?: AppointmentType;
  time: string; // ISO string for start time
  startTime?: string;
  endTime?: string;
  location: string;
  videoLink?: string;
  status?: AppointmentStatus;
  notes?: string;
  trial?: string; // For calendar display
  color?: string; // For calendar display
  createdAt?: string;
};

const KEY_PREFIX = "provider:appointments:v1:";

function getStorageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

// Local storage helpers for fallback
function readLocal(userId: string): Appointment[] {
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

function writeLocal(userId: string, list: Appointment[]): void {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    // ignore
  }
}

function generateAppointmentId(): string {
  return "apt_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 9);
}

// API helpers
async function fetchAppointmentsFromAPI(
  userId: string,
  filters?: { startDate?: string; endDate?: string; patientId?: string; nctId?: string; status?: string }
): Promise<{ ok: boolean; appointments: Appointment[] }> {
  try {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    if (filters?.patientId) params.set("patientId", filters.patientId);
    if (filters?.nctId) params.set("nctId", filters.nctId);
    if (filters?.status) params.set("status", filters.status);

    const queryString = params.toString();
    const url = `/api/appointments${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
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

    // Transform API response to local format
    const appointments = (data.appointments || []).map((apt: any) => ({
      id: apt.appointmentId || apt.id,
      appointmentId: apt.appointmentId,
      providerId: apt.providerId,
      patientId: apt.patientId,
      nctId: apt.nctId,
      title: apt.title,
      description: apt.description,
      appointmentType: apt.appointmentType,
      time: apt.startTime,
      startTime: apt.startTime,
      endTime: apt.endTime,
      location: apt.location || "",
      videoLink: apt.videoLink,
      status: apt.status,
      notes: apt.notes,
      trial: apt.nctId || "",
      color: getAppointmentColor(apt.appointmentType),
      createdAt: apt.createdAt,
    }));

    return { ok: true, appointments };
  } catch (error) {
    console.warn("Failed to fetch appointments from API, using local storage:", error);
    return { ok: false, appointments: readLocal(userId) };
  }
}

function getAppointmentColor(type?: string): string {
  switch (type) {
    case "screening":
      return "bg-blue-100";
    case "consent":
      return "bg-green-100";
    case "treatment":
      return "bg-purple-100";
    case "follow_up":
      return "bg-yellow-100";
    case "assessment":
      return "bg-orange-100";
    default:
      return "bg-gray-100";
  }
}

async function createAppointmentAPI(
  userId: string,
  appointment: Omit<Appointment, "id">
): Promise<{ ok: boolean; appointment?: Appointment; error?: string }> {
  try {
    const headers = await addCsrfHeader({
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-provider-id": userId,
    });

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId: appointment.patientId,
        nctId: appointment.nctId,
        title: appointment.title,
        description: appointment.description,
        appointmentType: appointment.appointmentType || "screening",
        startTime: appointment.startTime || appointment.time,
        endTime: appointment.endTime,
        location: appointment.location,
        videoLink: appointment.videoLink,
        notes: appointment.notes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error };
    }

    return {
      ok: true,
      appointment: {
        id: data.appointment?.appointmentId || generateAppointmentId(),
        ...appointment,
        appointmentId: data.appointment?.appointmentId,
        status: data.appointment?.status || "scheduled",
      },
    };
  } catch (error) {
    console.warn("Failed to create appointment via API:", error);
    return { ok: false, error: "API unavailable" };
  }
}

async function updateAppointmentAPI(
  userId: string,
  appointmentId: string,
  updates: Partial<Appointment>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await addCsrfHeader({
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-provider-id": userId,
    });

    const response = await fetch("/api/appointments", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        appointmentId,
        patientId: updates.patientId,
        nctId: updates.nctId,
        title: updates.title,
        description: updates.description,
        appointmentType: updates.appointmentType,
        startTime: updates.startTime || updates.time,
        endTime: updates.endTime,
        location: updates.location,
        videoLink: updates.videoLink,
        status: updates.status,
        notes: updates.notes,
      }),
    });

    const data = await response.json();
    return { ok: response.ok, error: data.error };
  } catch (error) {
    console.warn("Failed to update appointment via API:", error);
    return { ok: false, error: "API unavailable" };
  }
}

async function cancelAppointmentAPI(
  userId: string,
  appointmentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await addCsrfHeader({
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-provider-id": userId,
    });

    const response = await fetch(`/api/appointments?appointmentId=${encodeURIComponent(appointmentId)}`, {
      method: "DELETE",
      headers,
    });

    const data = await response.json();
    return { ok: response.ok, error: data.error };
  } catch (error) {
    console.warn("Failed to cancel appointment via API:", error);
    return { ok: false, error: "API unavailable" };
  }
}

// Public API
export async function getAppointmentsAsync(
  userId: string,
  filters?: { startDate?: string; endDate?: string; patientId?: string; nctId?: string; status?: string }
): Promise<Appointment[]> {
  const { ok, appointments } = await fetchAppointmentsFromAPI(userId, filters);

  if (ok) {
    writeLocal(userId, appointments);
  }

  return appointments;
}

// Synchronous version for backward compatibility
export function getAppointments(userId: string): Appointment[] {
  return readLocal(userId);
}

export async function addAppointmentAsync(
  userId: string,
  appointment: Omit<Appointment, "id">
): Promise<{ ok: boolean; appointment?: Appointment; error?: string }> {
  const newId = generateAppointmentId();
  const newAppointment: Appointment = {
    ...appointment,
    id: newId,
    appointmentId: newId,
    status: appointment.status || "scheduled",
    createdAt: new Date().toISOString(),
  };

  // Optimistic update
  const list = readLocal(userId);
  list.push(newAppointment);
  writeLocal(userId, list);

  // Sync to API
  const result = await createAppointmentAPI(userId, appointment);

  if (result.ok && result.appointment) {
    // Update with server-generated ID
    const updatedList = readLocal(userId);
    const idx = updatedList.findIndex((a) => a.id === newId);
    if (idx >= 0) {
      updatedList[idx] = { ...updatedList[idx], ...result.appointment };
      writeLocal(userId, updatedList);
    }
    return { ok: true, appointment: result.appointment };
  }

  return { ok: true, appointment: newAppointment };
}

// Synchronous version for backward compatibility
export function addAppointment(userId: string, appointment: Appointment): void {
  const list = readLocal(userId);
  list.push({ ...appointment, createdAt: new Date().toISOString() });
  writeLocal(userId, list);

  // Fire and forget API sync
  createAppointmentAPI(userId, appointment).catch(() => {});
}

export async function updateAppointmentAsync(
  userId: string,
  appointmentId: string,
  updates: Partial<Appointment>
): Promise<{ ok: boolean; error?: string }> {
  // Optimistic update
  const list = readLocal(userId);
  const idx = list.findIndex((a) => a.id === appointmentId || a.appointmentId === appointmentId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    writeLocal(userId, list);
  }

  // Sync to API
  return updateAppointmentAPI(userId, appointmentId, updates);
}

export async function cancelAppointmentAsync(
  userId: string,
  appointmentId: string
): Promise<{ ok: boolean; error?: string }> {
  // Optimistic update - mark as cancelled locally
  const list = readLocal(userId);
  const idx = list.findIndex((a) => a.id === appointmentId || a.appointmentId === appointmentId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], status: "cancelled" };
    writeLocal(userId, list);
  }

  // Sync to API
  return cancelAppointmentAPI(userId, appointmentId);
}

export function removeAppointment(userId: string, appointmentId: string): void {
  const list = readLocal(userId);
  writeLocal(userId, list.filter((a) => a.id !== appointmentId && a.appointmentId !== appointmentId));

  // Fire and forget API sync
  cancelAppointmentAPI(userId, appointmentId).catch(() => {});
}

// Get upcoming appointments
export async function getUpcomingAppointmentsAsync(
  userId: string,
  limit: number = 5
): Promise<Appointment[]> {
  const now = new Date().toISOString();
  const appointments = await getAppointmentsAsync(userId, { startDate: now });

  return appointments
    .filter((a) => a.status !== "cancelled")
    .sort((a, b) => new Date(a.time || a.startTime || "").getTime() - new Date(b.time || b.startTime || "").getTime())
    .slice(0, limit);
}

// Get today's appointments
export async function getTodayAppointmentsAsync(userId: string): Promise<Appointment[]> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  return getAppointmentsAsync(userId, { startDate: startOfDay, endDate: endOfDay });
}
