import type { Handler } from "@netlify/functions";
import { query, logAuditEvent } from "./db";
import { createCorsHandler } from "./cors-utils";
import { validateCsrfToken, getCsrfTokenFromHeaders } from "./csrf-utils";
import crypto from "crypto";

function generateTrialId(): string {
  return "TC" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString("hex").toUpperCase();
}

export type CustomTrial = {
  id: number;
  trialId: string;
  providerId: string;
  title: string;
  briefSummary?: string;
  detailedDescription?: string;
  status: string;
  phase?: string;
  studyType?: string;
  conditions?: string[];
  interventions?: any[];
  eligibilityCriteria?: string;
  minAge?: number;
  maxAge?: number;
  gender?: string;
  enrollmentTarget?: number;
  enrollmentCurrent: number;
  startDate?: string;
  estimatedCompletion?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  locations?: any[];
  documents?: any[];
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export const handler: Handler = async (event) => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("GET,POST,PUT,DELETE,OPTIONS");
  }

  const userId = event.headers["x-user-id"];
  const providerId = event.headers["x-provider-id"] || userId;

  if (!userId) {
    return cors.response(401, { ok: false, error: "Missing x-user-id header" });
  }

  try {
    // GET - Fetch custom trials
    if (event.httpMethod === "GET") {
      const { trialId, status, isPublished } = event.queryStringParameters || {};

      let sql = `
        SELECT
          id,
          trial_id as "trialId",
          provider_id as "providerId",
          title,
          brief_summary as "briefSummary",
          detailed_description as "detailedDescription",
          status,
          phase,
          study_type as "studyType",
          conditions,
          interventions,
          eligibility_criteria as "eligibilityCriteria",
          min_age as "minAge",
          max_age as "maxAge",
          gender,
          enrollment_target as "enrollmentTarget",
          enrollment_current as "enrollmentCurrent",
          start_date as "startDate",
          estimated_completion as "estimatedCompletion",
          primary_contact_name as "primaryContactName",
          primary_contact_email as "primaryContactEmail",
          primary_contact_phone as "primaryContactPhone",
          locations,
          documents,
          is_published as "isPublished",
          published_at as "publishedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM custom_trials
        WHERE provider_id = $1
      `;
      const params: any[] = [providerId];
      let paramIndex = 2;

      if (trialId) {
        sql += ` AND trial_id = $${paramIndex}`;
        params.push(trialId);
        paramIndex++;
      }

      if (status) {
        sql += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (isPublished !== undefined) {
        sql += ` AND is_published = $${paramIndex}`;
        params.push(isPublished === "true");
        paramIndex++;
      }

      sql += ` ORDER BY created_at DESC`;

      const result = await query(sql, params);

      return cors.response(200, {
        ok: true,
        trials: result.rows,
        count: result.rows.length,
      });
    }

    // POST - Create custom trial
    if (event.httpMethod === "POST") {
      const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
      if (!csrfToken || !validateCsrfToken(csrfToken)) {
        return cors.response(403, { error: "Invalid CSRF token" });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const {
        title,
        briefSummary,
        detailedDescription,
        status = "draft",
        phase,
        studyType,
        conditions,
        interventions,
        eligibilityCriteria,
        minAge,
        maxAge,
        gender,
        enrollmentTarget,
        startDate,
        estimatedCompletion,
        primaryContactName,
        primaryContactEmail,
        primaryContactPhone,
        locations,
      } = body;

      if (!title) {
        return cors.response(400, { ok: false, error: "Title is required" });
      }

      const trialId = generateTrialId();

      const result = await query(
        `INSERT INTO custom_trials (
          trial_id, provider_id, title, brief_summary, detailed_description,
          status, phase, study_type, conditions, interventions,
          eligibility_criteria, min_age, max_age, gender, enrollment_target,
          start_date, estimated_completion, primary_contact_name,
          primary_contact_email, primary_contact_phone, locations
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING trial_id as "trialId", title, status`,
        [
          trialId,
          providerId,
          title,
          briefSummary || null,
          detailedDescription || null,
          status,
          phase || null,
          studyType || null,
          conditions ? JSON.stringify(conditions) : null,
          interventions ? JSON.stringify(interventions) : null,
          eligibilityCriteria || null,
          minAge || null,
          maxAge || null,
          gender || null,
          enrollmentTarget || null,
          startDate || null,
          estimatedCompletion || null,
          primaryContactName || null,
          primaryContactEmail || null,
          primaryContactPhone || null,
          locations ? JSON.stringify(locations) : null,
        ]
      );

      await logAuditEvent(
        userId,
        "CUSTOM_TRIAL_CREATED",
        "custom_trial",
        trialId,
        undefined,
        { title, status },
        event.headers?.["x-forwarded-for"],
        event.headers?.["user-agent"]
      );

      return cors.response(201, {
        ok: true,
        message: "Trial created successfully",
        trial: result.rows[0],
      });
    }

    // PUT - Update custom trial
    if (event.httpMethod === "PUT") {
      const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
      if (!csrfToken || !validateCsrfToken(csrfToken)) {
        return cors.response(403, { error: "Invalid CSRF token" });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const { trialId } = body;

      if (!trialId) {
        return cors.response(400, { ok: false, error: "trialId is required" });
      }

      // Build dynamic update
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      const fieldMappings: Record<string, string> = {
        title: "title",
        briefSummary: "brief_summary",
        detailedDescription: "detailed_description",
        status: "status",
        phase: "phase",
        studyType: "study_type",
        eligibilityCriteria: "eligibility_criteria",
        minAge: "min_age",
        maxAge: "max_age",
        gender: "gender",
        enrollmentTarget: "enrollment_target",
        enrollmentCurrent: "enrollment_current",
        startDate: "start_date",
        estimatedCompletion: "estimated_completion",
        primaryContactName: "primary_contact_name",
        primaryContactEmail: "primary_contact_email",
        primaryContactPhone: "primary_contact_phone",
      };

      const jsonFields = ["conditions", "interventions", "locations", "documents"];

      for (const [jsField, dbField] of Object.entries(fieldMappings)) {
        if (body[jsField] !== undefined) {
          updates.push(`${dbField} = $${paramIndex}`);
          params.push(body[jsField]);
          paramIndex++;
        }
      }

      for (const field of jsonFields) {
        if (body[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(JSON.stringify(body[field]));
          paramIndex++;
        }
      }

      // Handle publish action
      if (body.isPublished !== undefined) {
        updates.push(`is_published = $${paramIndex}`);
        params.push(body.isPublished);
        paramIndex++;

        if (body.isPublished) {
          updates.push(`published_at = NOW()`);
        }
      }

      if (updates.length === 0) {
        return cors.response(400, { ok: false, error: "No fields to update" });
      }

      updates.push("updated_at = NOW()");
      params.push(trialId);
      params.push(providerId);

      const result = await query(
        `UPDATE custom_trials
         SET ${updates.join(", ")}
         WHERE trial_id = $${paramIndex} AND provider_id = $${paramIndex + 1}
         RETURNING trial_id as "trialId", title, status, is_published as "isPublished"`,
        params
      );

      if (result.rows.length === 0) {
        return cors.response(404, { ok: false, error: "Trial not found" });
      }

      await logAuditEvent(
        userId,
        "CUSTOM_TRIAL_UPDATED",
        "custom_trial",
        trialId,
        undefined,
        { updatedFields: Object.keys(body) },
        event.headers?.["x-forwarded-for"],
        event.headers?.["user-agent"]
      );

      return cors.response(200, {
        ok: true,
        message: "Trial updated successfully",
        trial: result.rows[0],
      });
    }

    // DELETE - Delete custom trial (only drafts)
    if (event.httpMethod === "DELETE") {
      const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
      if (!csrfToken || !validateCsrfToken(csrfToken)) {
        return cors.response(403, { error: "Invalid CSRF token" });
      }

      const trialId = event.queryStringParameters?.trialId;

      if (!trialId) {
        return cors.response(400, { ok: false, error: "trialId is required" });
      }

      // Only allow deletion of draft trials
      const result = await query(
        `DELETE FROM custom_trials
         WHERE trial_id = $1 AND provider_id = $2 AND status = 'draft' AND is_published = false
         RETURNING trial_id`,
        [trialId, providerId]
      );

      if (result.rows.length === 0) {
        return cors.response(400, {
          ok: false,
          error: "Cannot delete trial. Only unpublished draft trials can be deleted.",
        });
      }

      await logAuditEvent(
        userId,
        "CUSTOM_TRIAL_DELETED",
        "custom_trial",
        trialId,
        undefined,
        {},
        event.headers?.["x-forwarded-for"],
        event.headers?.["user-agent"]
      );

      return cors.response(200, {
        ok: true,
        message: "Trial deleted successfully",
      });
    }

    return cors.response(405, { error: "Method not allowed" });
  } catch (error: any) {
    console.error("Custom trials error:", error);
    return cors.response(500, {
      ok: false,
      error: error.message || "Internal server error",
    });
  }
};
