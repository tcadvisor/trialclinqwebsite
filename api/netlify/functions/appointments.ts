import type { Handler } from "@netlify/functions";
import { query, logAuditEvent } from "./db";
import { createCorsHandler } from "./cors-utils";
import { validateCsrfToken, getCsrfTokenFromHeaders } from "./csrf-utils";

function generateAppointmentId(): string {
  return "apt_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 9);
}

export type Appointment = {
  id: number;
  appointmentId: string;
  providerId: string;
  patientId?: string;
  nctId?: string;
  title: string;
  description?: string;
  appointmentType: string;
  startTime: string;
  endTime: string;
  location?: string;
  videoLink?: string;
  status: string;
  notes?: string;
  createdAt: string;
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
    // GET - Fetch appointments
    if (event.httpMethod === "GET") {
      const { startDate, endDate, patientId, nctId, status } = event.queryStringParameters || {};

      let sql = `
        SELECT
          id,
          appointment_id as "appointmentId",
          provider_id as "providerId",
          patient_id as "patientId",
          nct_id as "nctId",
          title,
          description,
          appointment_type as "appointmentType",
          start_time as "startTime",
          end_time as "endTime",
          location,
          video_link as "videoLink",
          status,
          notes,
          created_at as "createdAt"
        FROM appointments
        WHERE provider_id = $1
      `;
      const params: any[] = [providerId];
      let paramIndex = 2;

      if (startDate) {
        sql += ` AND start_time >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        sql += ` AND start_time <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      if (patientId) {
        sql += ` AND patient_id = $${paramIndex}`;
        params.push(patientId);
        paramIndex++;
      }

      if (nctId) {
        sql += ` AND nct_id = $${paramIndex}`;
        params.push(nctId);
        paramIndex++;
      }

      if (status) {
        sql += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      sql += ` ORDER BY start_time ASC`;

      const result = await query(sql, params);

      return cors.response(200, {
        ok: true,
        appointments: result.rows,
        count: result.rows.length,
      });
    }

    // POST - Create appointment
    if (event.httpMethod === "POST") {
      const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
      if (!csrfToken || !validateCsrfToken(csrfToken)) {
        return cors.response(403, { error: "Invalid CSRF token" });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const {
        patientId,
        nctId,
        title,
        description,
        appointmentType = "screening",
        startTime,
        endTime,
        location,
        videoLink,
        notes,
      } = body;

      if (!title || !startTime || !endTime) {
        return cors.response(400, {
          ok: false,
          error: "title, startTime, and endTime are required",
        });
      }

      const appointmentId = generateAppointmentId();

      const result = await query(
        `INSERT INTO appointments (
          appointment_id, provider_id, patient_id, nct_id, title, description,
          appointment_type, start_time, end_time, location, video_link, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING
          id,
          appointment_id as "appointmentId",
          provider_id as "providerId",
          title,
          start_time as "startTime",
          end_time as "endTime",
          status`,
        [
          appointmentId,
          providerId,
          patientId || null,
          nctId || null,
          title,
          description || null,
          appointmentType,
          startTime,
          endTime,
          location || null,
          videoLink || null,
          notes || null,
        ]
      );

      await logAuditEvent(
        userId,
        "APPOINTMENT_CREATED",
        "appointment",
        appointmentId,
        patientId,
        { title, startTime, nctId },
        event.headers?.["x-forwarded-for"],
        event.headers?.["user-agent"]
      );

      return cors.response(201, {
        ok: true,
        message: "Appointment created successfully",
        appointment: result.rows[0],
      });
    }

    // PUT - Update appointment
    if (event.httpMethod === "PUT") {
      const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
      if (!csrfToken || !validateCsrfToken(csrfToken)) {
        return cors.response(403, { error: "Invalid CSRF token" });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const { appointmentId } = body;

      if (!appointmentId) {
        return cors.response(400, { ok: false, error: "appointmentId is required" });
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      const allowedFields = [
        "patientId:patient_id",
        "nctId:nct_id",
        "title:title",
        "description:description",
        "appointmentType:appointment_type",
        "startTime:start_time",
        "endTime:end_time",
        "location:location",
        "videoLink:video_link",
        "status:status",
        "notes:notes",
      ];

      for (const field of allowedFields) {
        const [jsField, dbField] = field.split(":");
        if (body[jsField] !== undefined) {
          updateFields.push(`${dbField} = $${paramIndex}`);
          params.push(body[jsField]);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return cors.response(400, { ok: false, error: "No fields to update" });
      }

      updateFields.push(`updated_at = NOW()`);
      params.push(appointmentId);
      params.push(providerId);

      const result = await query(
        `UPDATE appointments
         SET ${updateFields.join(", ")}
         WHERE appointment_id = $${paramIndex} AND provider_id = $${paramIndex + 1}
         RETURNING
           id,
           appointment_id as "appointmentId",
           title,
           status`,
        params
      );

      if (result.rows.length === 0) {
        return cors.response(404, { ok: false, error: "Appointment not found" });
      }

      await logAuditEvent(
        userId,
        "APPOINTMENT_UPDATED",
        "appointment",
        appointmentId,
        body.patientId,
        { updatedFields: Object.keys(body) },
        event.headers?.["x-forwarded-for"],
        event.headers?.["user-agent"]
      );

      return cors.response(200, {
        ok: true,
        message: "Appointment updated successfully",
        appointment: result.rows[0],
      });
    }

    // DELETE - Cancel/delete appointment
    if (event.httpMethod === "DELETE") {
      const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
      if (!csrfToken || !validateCsrfToken(csrfToken)) {
        return cors.response(403, { error: "Invalid CSRF token" });
      }

      const appointmentId = event.queryStringParameters?.appointmentId;

      if (!appointmentId) {
        return cors.response(400, { ok: false, error: "appointmentId is required" });
      }

      // Soft delete by setting status to cancelled
      const result = await query(
        `UPDATE appointments
         SET status = 'cancelled', updated_at = NOW()
         WHERE appointment_id = $1 AND provider_id = $2
         RETURNING id`,
        [appointmentId, providerId]
      );

      if (result.rows.length === 0) {
        return cors.response(404, { ok: false, error: "Appointment not found" });
      }

      await logAuditEvent(
        userId,
        "APPOINTMENT_CANCELLED",
        "appointment",
        appointmentId,
        undefined,
        {},
        event.headers?.["x-forwarded-for"],
        event.headers?.["user-agent"]
      );

      return cors.response(200, {
        ok: true,
        message: "Appointment cancelled successfully",
      });
    }

    return cors.response(405, { error: "Method not allowed" });
  } catch (error: any) {
    console.error("Appointments error:", error);
    return cors.response(500, {
      ok: false,
      error: error.message || "Internal server error",
    });
  }
};
