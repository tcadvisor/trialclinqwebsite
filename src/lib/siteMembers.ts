import { addCsrfHeader } from "./csrf";

export type SiteMemberRole = "admin" | "principal_investigator" | "coordinator" | "cra" | "viewer";
export type MemberStatus = "pending" | "active" | "inactive";

export type SiteMember = {
  id: number;
  siteId: string;
  userId?: string;
  email: string;
  role: SiteMemberRole;
  status: MemberStatus;
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
  firstName?: string;
  lastName?: string;
};

const ROLE_LABELS: Record<SiteMemberRole, string> = {
  admin: "Administrator",
  principal_investigator: "Principal Investigator",
  coordinator: "Study Coordinator",
  cra: "Clinical Research Associate",
  viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<SiteMemberRole, string> = {
  admin: "Full access to all features and settings",
  principal_investigator: "Manage trials, view all data, approve enrollments",
  coordinator: "Manage patients, appointments, and day-to-day operations",
  cra: "Monitor trial progress and compliance",
  viewer: "View-only access to trial data",
};

export function getRoleLabel(role: SiteMemberRole): string {
  return ROLE_LABELS[role] || role;
}

export function getRoleDescription(role: SiteMemberRole): string {
  return ROLE_DESCRIPTIONS[role] || "";
}

export function getAllRoles(): SiteMemberRole[] {
  return ["admin", "principal_investigator", "coordinator", "cra", "viewer"];
}

// API functions
export async function getSiteMembers(
  userId: string,
  siteId?: string,
  filters?: { status?: MemberStatus; role?: SiteMemberRole }
): Promise<{
  ok: boolean;
  members: SiteMember[];
  roleCounts: Record<string, number>;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.role) params.set("role", filters.role);

    const queryString = params.toString();
    const url = `/api/site-members${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-site-id": siteId || userId,
        "x-provider-id": userId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, members: [], roleCounts: {}, error: data.error };
    }

    return {
      ok: true,
      members: data.members || [],
      roleCounts: data.roleCounts || {},
    };
  } catch (error) {
    console.error("Failed to fetch site members:", error);
    return { ok: false, members: [], roleCounts: {}, error: "Failed to fetch members" };
  }
}

export async function inviteMember(
  userId: string,
  email: string,
  role: SiteMemberRole = "coordinator",
  siteId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await addCsrfHeader({
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-site-id": siteId || userId,
      "x-provider-id": userId,
    });

    const response = await fetch("/api/site-members", {
      method: "POST",
      headers,
      body: JSON.stringify({ email, role }),
    });

    const data = await response.json();
    return { ok: response.ok, error: data.error };
  } catch (error) {
    console.error("Failed to invite member:", error);
    return { ok: false, error: "Failed to send invitation" };
  }
}

export async function updateMemberRole(
  userId: string,
  memberEmail: string,
  newRole: SiteMemberRole,
  siteId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await addCsrfHeader({
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-site-id": siteId || userId,
      "x-provider-id": userId,
    });

    const response = await fetch("/api/site-members", {
      method: "PUT",
      headers,
      body: JSON.stringify({ email: memberEmail, role: newRole }),
    });

    const data = await response.json();
    return { ok: response.ok, error: data.error };
  } catch (error) {
    console.error("Failed to update member role:", error);
    return { ok: false, error: "Failed to update role" };
  }
}

export async function removeMember(
  userId: string,
  memberEmail: string,
  siteId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await addCsrfHeader({
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-site-id": siteId || userId,
      "x-provider-id": userId,
    });

    const response = await fetch(`/api/site-members?email=${encodeURIComponent(memberEmail)}`, {
      method: "DELETE",
      headers,
    });

    const data = await response.json();
    return { ok: response.ok, error: data.error };
  } catch (error) {
    console.error("Failed to remove member:", error);
    return { ok: false, error: "Failed to remove member" };
  }
}

export async function acceptInvitation(
  userId: string,
  userEmail: string
): Promise<{ ok: boolean; siteId?: string; error?: string }> {
  try {
    const headers = await addCsrfHeader({
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-user-email": userEmail,
    });

    const response = await fetch("/api/site-members", {
      method: "PUT",
      headers,
      body: JSON.stringify({ action: "accept", email: userEmail }),
    });

    const data = await response.json();
    return { ok: response.ok, siteId: data.siteId, error: data.error };
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return { ok: false, error: "Failed to accept invitation" };
  }
}

// Check if user has specific permission
export function hasPermission(
  role: SiteMemberRole,
  permission: "manage_trials" | "manage_patients" | "manage_team" | "view_analytics" | "export_data"
): boolean {
  const permissions: Record<SiteMemberRole, string[]> = {
    admin: ["manage_trials", "manage_patients", "manage_team", "view_analytics", "export_data"],
    principal_investigator: ["manage_trials", "manage_patients", "view_analytics", "export_data"],
    coordinator: ["manage_patients", "view_analytics"],
    cra: ["view_analytics"],
    viewer: [],
  };

  return permissions[role]?.includes(permission) || false;
}
