import type { Handler } from "@netlify/functions";
import { query } from "./db";
import { createCorsHandler } from "./cors-utils";

export type AnalyticsSummary = {
  totalTrials: number;
  activeTrials: number;
  totalPatients: number;
  pipelineByStatus: Record<string, number>;
  enrollmentFunnel: {
    interested: number;
    contacted: number;
    screened: number;
    eligible: number;
    enrolled: number;
  };
  appointmentsToday: number;
  appointmentsThisWeek: number;
  recentActivity: any[];
  trialPerformance: any[];
  // Custom patient database metrics
  customPatients: {
    totalDatabases: number;
    totalPatients: number;
    totalMatches: number;
    matchesByStatus: Record<string, number>;
  };
};

export const handler: Handler = async (event) => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("GET,OPTIONS");
  }

  if (event.httpMethod !== "GET") {
    return cors.response(405, { error: "Method not allowed" });
  }

  const userId = event.headers["x-user-id"];
  const providerId = event.headers["x-provider-id"] || userId;

  if (!userId) {
    return cors.response(401, { ok: false, error: "Missing x-user-id header" });
  }

  try {
    const { type = "summary", startDate, endDate, nctId } = event.queryStringParameters || {};

    // ==================== SUMMARY DASHBOARD ====================
    if (type === "summary") {
      // Get trial counts
      const trialsResult = await query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status IN ('Recruiting', 'Active', 'Enrolling by Invitation')) as active
         FROM provider_trials
         WHERE provider_id = $1`,
        [providerId]
      );

      // Get patient pipeline counts
      const pipelineResult = await query(
        `SELECT status, COUNT(*) as count
         FROM patient_pipeline
         WHERE provider_id = $1
         GROUP BY status`,
        [providerId]
      );

      const pipelineByStatus: Record<string, number> = {};
      let totalPatients = 0;
      for (const row of pipelineResult.rows) {
        pipelineByStatus[row.status] = parseInt(row.count);
        totalPatients += parseInt(row.count);
      }

      // Get enrollment funnel from patient_pipeline
      const funnelResult = await query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'interested') as interested,
          COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
          COUNT(*) FILTER (WHERE status IN ('screening', 'screened')) as screened,
          COUNT(*) FILTER (WHERE status = 'eligible') as eligible,
          COUNT(*) FILTER (WHERE status IN ('enrolled', 'active')) as enrolled
         FROM patient_pipeline
         WHERE provider_id = $1`,
        [providerId]
      );

      const funnel = funnelResult.rows[0];

      // Get custom patient database stats
      let customPatients = {
        totalDatabases: 0,
        totalPatients: 0,
        totalMatches: 0,
        matchesByStatus: {} as Record<string, number>,
      };

      try {
        // Custom databases count
        const customDbResult = await query(
          `SELECT COUNT(*) as count, COALESCE(SUM(patient_count), 0) as total_patients
           FROM custom_patient_databases
           WHERE user_id = $1`,
          [userId]
        );

        // Custom matches by status
        const customMatchesResult = await query(
          `SELECT eligibility_status as status, COUNT(*) as count
           FROM custom_trial_matches
           WHERE user_id = $1
           GROUP BY eligibility_status`,
          [userId]
        );

        let totalCustomMatches = 0;
        const matchesByStatus: Record<string, number> = {};
        for (const row of customMatchesResult.rows) {
          matchesByStatus[row.status] = parseInt(row.count);
          totalCustomMatches += parseInt(row.count);
        }

        customPatients = {
          totalDatabases: parseInt(customDbResult.rows[0]?.count || 0),
          totalPatients: parseInt(customDbResult.rows[0]?.total_patients || 0),
          totalMatches: totalCustomMatches,
          matchesByStatus,
        };

        // Add custom patient counts to total patients
        totalPatients += customPatients.totalPatients;

        // Merge custom match statuses into enrollment funnel
        funnel.interested = parseInt(funnel?.interested || 0) + (matchesByStatus["potential"] || 0);
        funnel.eligible = parseInt(funnel?.eligible || 0) + (matchesByStatus["eligible"] || 0);
        funnel.contacted = parseInt(funnel?.contacted || 0) + (matchesByStatus["contacted"] || 0);
        funnel.enrolled = parseInt(funnel?.enrolled || 0) + (matchesByStatus["enrolled"] || 0);
      } catch (e) {
        // Custom patient tables might not exist yet - that's okay
        console.log("Custom patient tables not found, skipping custom analytics");
      }

      // Get appointments
      const appointmentsResult = await query(
        `SELECT
          COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE) as today,
          COUNT(*) FILTER (WHERE start_time >= DATE_TRUNC('week', CURRENT_DATE) AND start_time < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days') as this_week
         FROM appointments
         WHERE provider_id = $1 AND status != 'cancelled'`,
        [providerId]
      );

      // Get recent activity (audit logs)
      const activityResult = await query(
        `SELECT action, resource_type, resource_id, created_at
         FROM audit_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId]
      );

      // Get trial performance (including custom matches)
      let performanceResult;
      try {
        performanceResult = await query(
          `SELECT
            pt.nct_id as "nctId",
            pt.title,
            COALESCE(COUNT(pp.id), 0) + COALESCE(COUNT(DISTINCT ctm.patient_id), 0) as total_patients,
            COALESCE(COUNT(pp.id) FILTER (WHERE pp.status = 'enrolled'), 0) + COALESCE(COUNT(DISTINCT ctm.patient_id) FILTER (WHERE ctm.eligibility_status = 'enrolled'), 0) as enrolled,
            COALESCE(COUNT(pp.id) FILTER (WHERE pp.status = 'interested'), 0) + COALESCE(COUNT(DISTINCT ctm.patient_id) FILTER (WHERE ctm.eligibility_status = 'potential'), 0) as interested
           FROM provider_trials pt
           LEFT JOIN patient_pipeline pp ON pt.nct_id = pp.nct_id AND pp.provider_id = $1
           LEFT JOIN custom_trial_matches ctm ON pt.nct_id = ctm.nct_id AND ctm.user_id = $1
           WHERE pt.provider_id = $1
           GROUP BY pt.nct_id, pt.title
           ORDER BY total_patients DESC
           LIMIT 5`,
          [providerId]
        );
      } catch (e) {
        // Fallback without custom matches
        performanceResult = await query(
          `SELECT
            pt.nct_id as "nctId",
            pt.title,
            COUNT(pp.id) as total_patients,
            COUNT(pp.id) FILTER (WHERE pp.status = 'enrolled') as enrolled,
            COUNT(pp.id) FILTER (WHERE pp.status = 'interested') as interested
           FROM provider_trials pt
           LEFT JOIN patient_pipeline pp ON pt.nct_id = pp.nct_id AND pp.provider_id = $1
           WHERE pt.provider_id = $1
           GROUP BY pt.nct_id, pt.title
           ORDER BY total_patients DESC
           LIMIT 5`,
          [providerId]
        );
      }

      return cors.response(200, {
        ok: true,
        summary: {
          totalTrials: parseInt(trialsResult.rows[0]?.total || 0),
          activeTrials: parseInt(trialsResult.rows[0]?.active || 0),
          totalPatients,
          pipelineByStatus,
          enrollmentFunnel: {
            interested: parseInt(funnel?.interested || 0),
            contacted: parseInt(funnel?.contacted || 0),
            screened: parseInt(funnel?.screened || 0),
            eligible: parseInt(funnel?.eligible || 0),
            enrolled: parseInt(funnel?.enrolled || 0),
          },
          appointmentsToday: parseInt(appointmentsResult.rows[0]?.today || 0),
          appointmentsThisWeek: parseInt(appointmentsResult.rows[0]?.this_week || 0),
          recentActivity: activityResult.rows,
          trialPerformance: performanceResult.rows,
          customPatients,
        },
      });
    }

    // ==================== ENROLLMENT TRENDS ====================
    if (type === "enrollment-trends") {
      const rawDays = parseInt(event.queryStringParameters?.days || "30");
      const days = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 30;

      const result = await query(
        `SELECT
          DATE(created_at) as date,
          status,
          COUNT(*) as count
         FROM patient_pipeline
         WHERE provider_id = $1
           AND created_at >= CURRENT_DATE - make_interval(days => $2)
         GROUP BY DATE(created_at), status
         ORDER BY date`,
        [providerId, days]
      );

      // Transform into series data
      const dateMap = new Map<string, Record<string, number>>();
      for (const row of result.rows) {
        const dateStr = row.date.toISOString().split("T")[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, {});
        }
        dateMap.get(dateStr)![row.status] = parseInt(row.count);
      }

      const trends = Array.from(dateMap.entries()).map(([date, counts]) => ({
        date,
        ...counts,
      }));

      return cors.response(200, {
        ok: true,
        trends,
      });
    }

    // ==================== TRIAL PERFORMANCE ====================
    if (type === "trial-performance") {
      let result;
      try {
        // Try to include custom patient matches
        result = await query(
          `SELECT
            pt.nct_id as "nctId",
            pt.title,
            pt.status,
            pt.phase,
            COALESCE(COUNT(DISTINCT pp.id), 0) + COALESCE(COUNT(DISTINCT ctm.patient_id), 0) as "totalPatients",
            COALESCE(COUNT(DISTINCT pp.id) FILTER (WHERE pp.status = 'interested'), 0) + COALESCE(COUNT(DISTINCT ctm.patient_id) FILTER (WHERE ctm.eligibility_status = 'potential'), 0) as "interested",
            COALESCE(COUNT(DISTINCT pp.id) FILTER (WHERE pp.status = 'contacted'), 0) + COALESCE(COUNT(DISTINCT ctm.patient_id) FILTER (WHERE ctm.eligibility_status = 'contacted'), 0) as "contacted",
            COALESCE(COUNT(DISTINCT pp.id) FILTER (WHERE pp.status IN ('screening', 'screened')), 0) as "screened",
            COALESCE(COUNT(DISTINCT pp.id) FILTER (WHERE pp.status = 'eligible'), 0) + COALESCE(COUNT(DISTINCT ctm.patient_id) FILTER (WHERE ctm.eligibility_status = 'eligible'), 0) as "eligible",
            COALESCE(COUNT(DISTINCT pp.id) FILTER (WHERE pp.status = 'enrolled'), 0) + COALESCE(COUNT(DISTINCT ctm.patient_id) FILTER (WHERE ctm.eligibility_status = 'enrolled'), 0) as "enrolled",
            COALESCE(COUNT(DISTINCT pp.id) FILTER (WHERE pp.status = 'withdrawn'), 0) as "withdrawn",
            CASE
              WHEN (COALESCE(COUNT(DISTINCT pp.id) FILTER (WHERE pp.status = 'interested'), 0) + COALESCE(COUNT(DISTINCT ctm.patient_id) FILTER (WHERE ctm.eligibility_status = 'potential'), 0)) > 0
              THEN ROUND(
                (COALESCE(COUNT(DISTINCT pp.id) FILTER (WHERE pp.status = 'enrolled'), 0) + COALESCE(COUNT(DISTINCT ctm.patient_id) FILTER (WHERE ctm.eligibility_status = 'enrolled'), 0))::numeric /
                (COALESCE(COUNT(DISTINCT pp.id) FILTER (WHERE pp.status = 'interested'), 0) + COALESCE(COUNT(DISTINCT ctm.patient_id) FILTER (WHERE ctm.eligibility_status = 'potential'), 0)) * 100, 1)
              ELSE 0
            END as "conversionRate"
           FROM provider_trials pt
           LEFT JOIN patient_pipeline pp ON pt.nct_id = pp.nct_id AND pp.provider_id = $1
           LEFT JOIN custom_trial_matches ctm ON pt.nct_id = ctm.nct_id AND ctm.user_id = $1
           WHERE pt.provider_id = $1
           GROUP BY pt.nct_id, pt.title, pt.status, pt.phase
           ORDER BY "totalPatients" DESC`,
          [providerId]
        );
      } catch (e) {
        // Fallback without custom matches
        result = await query(
          `SELECT
            pt.nct_id as "nctId",
            pt.title,
            pt.status,
            pt.phase,
            COUNT(pp.id) as "totalPatients",
            COUNT(pp.id) FILTER (WHERE pp.status = 'interested') as "interested",
            COUNT(pp.id) FILTER (WHERE pp.status = 'contacted') as "contacted",
            COUNT(pp.id) FILTER (WHERE pp.status IN ('screening', 'screened')) as "screened",
            COUNT(pp.id) FILTER (WHERE pp.status = 'eligible') as "eligible",
            COUNT(pp.id) FILTER (WHERE pp.status = 'enrolled') as "enrolled",
            COUNT(pp.id) FILTER (WHERE pp.status = 'withdrawn') as "withdrawn",
            CASE WHEN COUNT(pp.id) FILTER (WHERE pp.status = 'interested') > 0
              THEN ROUND(COUNT(pp.id) FILTER (WHERE pp.status = 'enrolled')::numeric / COUNT(pp.id) FILTER (WHERE pp.status = 'interested') * 100, 1)
              ELSE 0
            END as "conversionRate"
           FROM provider_trials pt
           LEFT JOIN patient_pipeline pp ON pt.nct_id = pp.nct_id AND pp.provider_id = $1
           WHERE pt.provider_id = $1
           GROUP BY pt.nct_id, pt.title, pt.status, pt.phase
           ORDER BY "totalPatients" DESC`,
          [providerId]
        );
      }

      return cors.response(200, {
        ok: true,
        trials: result.rows,
      });
    }

    // ==================== EXPORT DATA ====================
    if (type === "export") {
      const format = event.queryStringParameters?.format || "json";
      const dataType = event.queryStringParameters?.dataType || "pipeline";

      let data: any[] = [];

      if (dataType === "pipeline") {
        const result = await query(
          `SELECT
            pp.patient_id as "patientId",
            pp.nct_id as "trialId",
            pp.status,
            pp.match_score as "matchScore",
            pp.contacted_at as "contactedAt",
            pp.screened_at as "screenedAt",
            pp.enrolled_at as "enrolledAt",
            pp.created_at as "createdAt",
            pat.email,
            pat.age,
            pat.gender,
            pat.primary_condition as "condition"
           FROM patient_pipeline pp
           LEFT JOIN patient_profiles pat ON pp.patient_id = pat.patient_id
           WHERE pp.provider_id = $1
           ORDER BY pp.created_at DESC`,
          [providerId]
        );
        data = result.rows;
      } else if (dataType === "appointments") {
        const result = await query(
          `SELECT
            appointment_id as "appointmentId",
            patient_id as "patientId",
            nct_id as "trialId",
            title,
            appointment_type as "type",
            start_time as "startTime",
            end_time as "endTime",
            location,
            status,
            created_at as "createdAt"
           FROM appointments
           WHERE provider_id = $1
           ORDER BY start_time DESC`,
          [providerId]
        );
        data = result.rows;
      } else if (dataType === "trials") {
        const result = await query(
          `SELECT
            nct_id as "nctId",
            title,
            status,
            phase,
            sponsor,
            conditions,
            enrollment_count as "enrollmentCount",
            start_date as "startDate",
            added_at as "addedAt"
           FROM provider_trials
           WHERE provider_id = $1
           ORDER BY added_at DESC`,
          [providerId]
        );
        data = result.rows;
      }

      if (format === "csv") {
        if (data.length === 0) {
          return cors.response(200, {
            ok: true,
            csv: "",
            filename: `${dataType}_export.csv`,
          });
        }

        const headers = Object.keys(data[0]);
        const csvRows = [
          headers.join(","),
          ...data.map((row) =>
            headers
              .map((h) => {
                const val = row[h];
                if (val === null || val === undefined) return "";
                if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
                  return `"${val.replace(/"/g, '""')}"`;
                }
                return String(val);
              })
              .join(",")
          ),
        ];

        return cors.response(200, {
          ok: true,
          csv: csvRows.join("\n"),
          filename: `${dataType}_export_${new Date().toISOString().split("T")[0]}.csv`,
        });
      }

      return cors.response(200, {
        ok: true,
        data,
        count: data.length,
      });
    }

    return cors.response(400, { ok: false, error: "Invalid analytics type" });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return cors.response(500, {
      ok: false,
      error: error.message || "Internal server error",
    });
  }
};
