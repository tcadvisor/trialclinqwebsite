import type { Handler } from "@netlify/functions";
import { query, logAuditEvent } from "./db";
import { createCorsHandler } from "./cors-utils";
import { validateCsrfToken, getCsrfTokenFromHeaders } from "./csrf-utils";

export type SiteMemberRole = "admin" | "principal_investigator" | "coordinator" | "cra" | "viewer";

export type SiteMember = {
  id: number;
  siteId: string;
  userId?: string;
  email: string;
  role: SiteMemberRole;
  status: "pending" | "active" | "inactive";
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
  firstName?: string;
  lastName?: string;
};

export const handler: Handler = async (event) => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("GET,POST,PUT,DELETE,OPTIONS");
  }

  const userId = event.headers["x-user-id"];
  const siteId = event.headers["x-site-id"] || event.headers["x-provider-id"] || userId;

  if (!userId) {
    return cors.response(401, { ok: false, error: "Missing x-user-id header" });
  }

  try {
    // GET - Fetch site members
    if (event.httpMethod === "GET") {
      const { status, role } = event.queryStringParameters || {};

      let sql = `
        SELECT
          sm.id,
          sm.site_id as "siteId",
          sm.user_id as "userId",
          sm.email,
          sm.role,
          sm.status,
          sm.invited_by as "invitedBy",
          sm.invited_at as "invitedAt",
          sm.accepted_at as "acceptedAt",
          u.first_name as "firstName",
          u.last_name as "lastName"
        FROM site_members sm
        LEFT JOIN users u ON sm.user_id = u.user_id
        WHERE sm.site_id = $1
      `;
      const params: any[] = [siteId];
      let paramIndex = 2;

      if (status) {
        sql += ` AND sm.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (role) {
        sql += ` AND sm.role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }

      sql += ` ORDER BY sm.invited_at DESC`;

      const result = await query(sql, params);

      // Get role counts
      const countResult = await query(
        `SELECT role, COUNT(*) as count
         FROM site_members
         WHERE site_id = $1 AND status = 'active'
         GROUP BY role`,
        [siteId]
      );

      const roleCounts: Record<string, number> = {};
      for (const row of countResult.rows) {
        roleCounts[row.role] = parseInt(row.count);
      }

      return cors.response(200, {
        ok: true,
        members: result.rows,
        count: result.rows.length,
        roleCounts,
      });
    }

    // POST - Invite new member
    if (event.httpMethod === "POST") {
      const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
      if (!csrfToken || !validateCsrfToken(csrfToken)) {
        return cors.response(403, { error: "Invalid CSRF token" });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const { email, role = "coordinator" } = body;

      if (!email) {
        return cors.response(400, { ok: false, error: "Email is required" });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if already invited
      const existing = await query(
        `SELECT id, status FROM site_members WHERE site_id = $1 AND email = $2`,
        [siteId, normalizedEmail]
      );

      if (existing.rows.length > 0) {
        if (existing.rows[0].status === "active") {
          return cors.response(409, {
            ok: false,
            error: "This user is already a member of this site",
          });
        }
        // Update existing invitation
        await query(
          `UPDATE site_members
           SET role = $1, status = 'pending', invited_by = $2, invited_at = NOW()
           WHERE site_id = $3 AND email = $4`,
          [role, userId, siteId, normalizedEmail]
        );
      } else {
        // Create new invitation
        await query(
          `INSERT INTO site_members (site_id, email, role, status, invited_by)
           VALUES ($1, $2, $3, 'pending', $4)`,
          [siteId, normalizedEmail, role, userId]
        );
      }

      // Check if user already exists in system
      const userResult = await query(
        `SELECT user_id FROM users WHERE email = $1`,
        [normalizedEmail]
      );

      if (userResult.rows.length > 0) {
        // Link existing user
        await query(
          `UPDATE site_members SET user_id = $1 WHERE site_id = $2 AND email = $3`,
          [userResult.rows[0].user_id, siteId, normalizedEmail]
        );
      }

      // TODO: Send invitation email

      await logAuditEvent(
        userId,
        "MEMBER_INVITED",
        "site_member",
        normalizedEmail,
        undefined,
        { role, siteId },
        event.headers?.["x-forwarded-for"],
        event.headers?.["user-agent"]
      );

      return cors.response(201, {
        ok: true,
        message: "Invitation sent successfully",
      });
    }

    // PUT - Update member role or accept invitation
    if (event.httpMethod === "PUT") {
      const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
      if (!csrfToken || !validateCsrfToken(csrfToken)) {
        return cors.response(403, { error: "Invalid CSRF token" });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const { email, role, action } = body;

      // Accept invitation
      if (action === "accept") {
        const result = await query(
          `UPDATE site_members
           SET status = 'active', user_id = $1, accepted_at = NOW()
           WHERE email = $2 AND status = 'pending'
           RETURNING site_id as "siteId", role`,
          [userId, body.email || event.headers["x-user-email"]]
        );

        if (result.rows.length === 0) {
          return cors.response(404, { ok: false, error: "No pending invitation found" });
        }

        await logAuditEvent(
          userId,
          "INVITATION_ACCEPTED",
          "site_member",
          result.rows[0].siteId,
          undefined,
          { role: result.rows[0].role },
          event.headers?.["x-forwarded-for"],
          event.headers?.["user-agent"]
        );

        return cors.response(200, {
          ok: true,
          message: "Invitation accepted",
          siteId: result.rows[0].siteId,
        });
      }

      // Update role
      if (email && role) {
        const result = await query(
          `UPDATE site_members
           SET role = $1, updated_at = NOW()
           WHERE site_id = $2 AND email = $3
           RETURNING id`,
          [role, siteId, email.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
          return cors.response(404, { ok: false, error: "Member not found" });
        }

        await logAuditEvent(
          userId,
          "MEMBER_ROLE_UPDATED",
          "site_member",
          email,
          undefined,
          { newRole: role, siteId },
          event.headers?.["x-forwarded-for"],
          event.headers?.["user-agent"]
        );

        return cors.response(200, {
          ok: true,
          message: "Member role updated",
        });
      }

      return cors.response(400, { ok: false, error: "Invalid request" });
    }

    // DELETE - Remove member
    if (event.httpMethod === "DELETE") {
      const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
      if (!csrfToken || !validateCsrfToken(csrfToken)) {
        return cors.response(403, { error: "Invalid CSRF token" });
      }

      const email = event.queryStringParameters?.email;

      if (!email) {
        return cors.response(400, { ok: false, error: "Email is required" });
      }

      const result = await query(
        `DELETE FROM site_members
         WHERE site_id = $1 AND email = $2
         RETURNING id`,
        [siteId, email.trim().toLowerCase()]
      );

      if (result.rows.length === 0) {
        return cors.response(404, { ok: false, error: "Member not found" });
      }

      await logAuditEvent(
        userId,
        "MEMBER_REMOVED",
        "site_member",
        email,
        undefined,
        { siteId },
        event.headers?.["x-forwarded-for"],
        event.headers?.["user-agent"]
      );

      return cors.response(200, {
        ok: true,
        message: "Member removed successfully",
      });
    }

    return cors.response(405, { error: "Method not allowed" });
  } catch (error: any) {
    console.error("Site members error:", error);
    return cors.response(500, {
      ok: false,
      error: error.message || "Internal server error",
    });
  }
};
