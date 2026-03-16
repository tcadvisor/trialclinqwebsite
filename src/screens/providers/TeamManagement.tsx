import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { useAuth } from "../../lib/auth";
import {
  getSiteMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  getRoleLabel,
  getAllRoles,
  type SiteMember,
  type SiteMemberRole,
} from "../../lib/siteMembers";
import { UserPlus, X, MoreHorizontal, Mail, Trash2 } from "lucide-react";

// Invite Modal
function InviteModal({
  isOpen,
  onClose,
  onInvite,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: SiteMemberRole) => Promise<void>;
}) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<SiteMemberRole>("coordinator");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSending(true);
    setError("");

    try {
      await onInvite(email, role);
      setEmail("");
      setRole("coordinator");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Invite Team Member</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@hospital.org"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as SiteMemberRole)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {getAllRoles().map((r) => (
                <option key={r} value={r}>
                  {getRoleLabel(r)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {role === "admin" && "Full access to all features and settings"}
              {role === "principal_investigator" &&
                "Manage trials, view all data, approve enrollments"}
              {role === "coordinator" && "Manage patients, appointments, and day-to-day operations"}
              {role === "cra" && "Monitor trial progress and compliance"}
              {role === "viewer" && "View-only access to trial data"}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !email}
              className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm hover:bg-black disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Member row actions dropdown
function MemberActions({
  member,
  onChangeRole,
  onRemove,
}: {
  member: SiteMember;
  onChangeRole: (newRole: SiteMemberRole) => void;
  onRemove: () => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg"
      >
        <MoreHorizontal className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border bg-white shadow-lg">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500">Change Role</div>
            {getAllRoles().map((role) => (
              <button
                key={role}
                onClick={() => {
                  onChangeRole(role);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  member.role === role ? "bg-gray-50 font-medium" : ""
                }`}
              >
                {getRoleLabel(role)}
              </button>
            ))}
            <div className="border-t my-1" />
            <button
              onClick={() => {
                onRemove();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Remove Member
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamManagement(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.userId || "";
  const [members, setMembers] = React.useState<SiteMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [roleCounts, setRoleCounts] = React.useState<Record<string, number>>({});

  // Load members
  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadMembers = async () => {
      setLoading(true);
      const result = await getSiteMembers(userId);

      if (result.ok) {
        setMembers(result.members);
        setRoleCounts(result.roleCounts);
      }

      setLoading(false);
    };

    loadMembers();
  }, [userId]);

  const handleInvite = async (email: string, role: SiteMemberRole) => {
    const result = await inviteMember(userId, email, role);

    if (!result.ok) {
      throw new Error(result.error || "Failed to send invitation");
    }

    // Refresh members list
    const refreshResult = await getSiteMembers(userId);
    if (refreshResult.ok) {
      setMembers(refreshResult.members);
      setRoleCounts(refreshResult.roleCounts);
    }
  };

  const handleChangeRole = async (member: SiteMember, newRole: SiteMemberRole) => {
    const result = await updateMemberRole(userId, member.email, newRole);

    if (result.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.email === member.email ? { ...m, role: newRole } : m))
      );
    }
  };

  const handleRemove = async (member: SiteMember) => {
    if (!confirm(`Remove ${member.email} from the team?`)) return;

    const result = await removeMember(userId, member.email);

    if (result.ok) {
      setMembers((prev) => prev.filter((m) => m.email !== member.email));
    }
  };

  const activeMembers = members.filter((m) => m.status === "active");
  const pendingMembers = members.filter((m) => m.status === "pending");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Team Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Invite and manage team members for your site
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-gray-900 text-white rounded-full px-4 py-2 text-sm hover:bg-black"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        </div>

        {/* Role summary */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          {getAllRoles().map((role) => (
            <div key={role} className="bg-white rounded-xl border p-3">
              <div className="text-xs text-gray-500">{getRoleLabel(role)}</div>
              <div className="text-xl font-semibold mt-1">{roleCounts[role] || 0}</div>
            </div>
          ))}
        </div>

        {/* Pending invitations */}
        {pendingMembers.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-gray-700 mb-3">
              Pending Invitations ({pendingMembers.length})
            </h2>
            <div className="bg-white rounded-2xl border divide-y">
              {pendingMembers.map((member) => (
                <div
                  key={member.email}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="font-medium">{member.email}</div>
                      <div className="text-xs text-gray-500">
                        Invited as {getRoleLabel(member.role)} •{" "}
                        {new Date(member.invitedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active members */}
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Team Members ({activeMembers.length})
          </h2>
          <div className="bg-white rounded-2xl border">
            {loading ? (
              <div className="px-4 py-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-3"></div>
                Loading team members...
              </div>
            ) : activeMembers.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                <UserPlus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">No team members yet</p>
                <p className="text-sm mt-1">Invite colleagues to collaborate on your trials</p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-black"
                >
                  Invite First Member
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {activeMembers.map((member) => (
                  <div
                    key={member.email}
                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                        {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.email}
                        </div>
                        {member.firstName && (
                          <div className="text-xs text-gray-500">{member.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : member.role === "principal_investigator"
                            ? "bg-blue-100 text-blue-700"
                            : member.role === "coordinator"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {getRoleLabel(member.role)}
                      </span>
                      <MemberActions
                        member={member}
                        onChangeRole={(role) => handleChangeRole(member, role)}
                        onRemove={() => handleRemove(member)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <Link to="/providers/dashboard" className="hover:underline">
            Back to dashboard
          </Link>
        </div>
      </main>

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />
    </div>
  );
}
