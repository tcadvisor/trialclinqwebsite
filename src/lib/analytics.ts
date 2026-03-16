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
  recentActivity: ActivityItem[];
  trialPerformance: TrialPerformance[];
  // Custom patient database metrics
  customPatients?: {
    totalDatabases: number;
    totalPatients: number;
    totalMatches: number;
    matchesByStatus: Record<string, number>;
  };
};

export type ActivityItem = {
  action: string;
  resource_type: string;
  resource_id: string;
  created_at: string;
};

export type TrialPerformance = {
  nctId: string;
  title: string;
  totalPatients: number;
  interested: number;
  enrolled: number;
};

export type EnrollmentTrend = {
  date: string;
  interested?: number;
  contacted?: number;
  screened?: number;
  enrolled?: number;
};

export type TrialMetrics = {
  nctId: string;
  title: string;
  status: string;
  phase: string;
  totalPatients: number;
  interested: number;
  contacted: number;
  screened: number;
  eligible: number;
  enrolled: number;
  withdrawn: number;
  conversionRate: number;
};

// API functions
export async function getAnalyticsSummary(userId: string): Promise<{
  ok: boolean;
  summary?: AnalyticsSummary;
  error?: string;
}> {
  try {
    const response = await fetch("/api/analytics?type=summary", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-provider-id": userId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error };
    }

    return { ok: true, summary: data.summary };
  } catch (error) {
    console.error("Failed to fetch analytics summary:", error);
    return { ok: false, error: "Failed to fetch analytics" };
  }
}

export async function getEnrollmentTrends(
  userId: string,
  days: number = 30
): Promise<{
  ok: boolean;
  trends?: EnrollmentTrend[];
  error?: string;
}> {
  try {
    const response = await fetch(`/api/analytics?type=enrollment-trends&days=${days}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-provider-id": userId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error };
    }

    return { ok: true, trends: data.trends };
  } catch (error) {
    console.error("Failed to fetch enrollment trends:", error);
    return { ok: false, error: "Failed to fetch trends" };
  }
}

export async function getTrialPerformance(userId: string): Promise<{
  ok: boolean;
  trials?: TrialMetrics[];
  error?: string;
}> {
  try {
    const response = await fetch("/api/analytics?type=trial-performance", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-provider-id": userId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error };
    }

    return { ok: true, trials: data.trials };
  } catch (error) {
    console.error("Failed to fetch trial performance:", error);
    return { ok: false, error: "Failed to fetch performance data" };
  }
}

export async function exportData(
  userId: string,
  dataType: "pipeline" | "appointments" | "trials",
  format: "json" | "csv" = "csv"
): Promise<{
  ok: boolean;
  data?: any;
  csv?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `/api/analytics?type=export&dataType=${dataType}&format=${format}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
          "x-provider-id": userId,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error };
    }

    if (format === "csv") {
      return { ok: true, csv: data.csv, filename: data.filename };
    }

    return { ok: true, data: data.data };
  } catch (error) {
    console.error("Failed to export data:", error);
    return { ok: false, error: "Failed to export data" };
  }
}

// Helper to download CSV
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// Calculate funnel conversion rates
export function calculateFunnelConversions(funnel: AnalyticsSummary["enrollmentFunnel"]): {
  interestedToContacted: number;
  contactedToScreened: number;
  screenedToEligible: number;
  eligibleToEnrolled: number;
  overallConversion: number;
} {
  const safeDiv = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  return {
    interestedToContacted: safeDiv(funnel.contacted, funnel.interested),
    contactedToScreened: safeDiv(funnel.screened, funnel.contacted),
    screenedToEligible: safeDiv(funnel.eligible, funnel.screened),
    eligibleToEnrolled: safeDiv(funnel.enrolled, funnel.eligible),
    overallConversion: safeDiv(funnel.enrolled, funnel.interested),
  };
}

// Format activity for display
export function formatActivity(activity: ActivityItem): string {
  const actionLabels: Record<string, string> = {
    TRIAL_ADDED: "Added trial",
    TRIAL_REMOVED: "Removed trial",
    APPOINTMENT_CREATED: "Created appointment",
    APPOINTMENT_UPDATED: "Updated appointment",
    APPOINTMENT_CANCELLED: "Cancelled appointment",
    PIPELINE_STATUS_UPDATED: "Updated patient status",
    MEMBER_INVITED: "Invited team member",
    MESSAGE_SENT: "Sent message",
    LOGIN_SUCCESS: "Logged in",
  };

  return actionLabels[activity.action] || activity.action.replace(/_/g, " ").toLowerCase();
}
