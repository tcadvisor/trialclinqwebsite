import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { useAuth } from "../../lib/auth";
import {
  getAnalyticsSummary,
  getTrialPerformance,
  exportData,
  downloadCSV,
  calculateFunnelConversions,
  formatActivity,
  type AnalyticsSummary,
  type TrialMetrics,
} from "../../lib/analytics";
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Download,
  ArrowRight,
  Activity,
  Database,
  Target,
  UserCheck,
} from "lucide-react";

// Funnel visualization
function EnrollmentFunnel({ funnel }: { funnel: AnalyticsSummary["enrollmentFunnel"] }) {
  const conversions = calculateFunnelConversions(funnel);
  const stages = [
    { label: "Potential/Interested", value: funnel.interested, color: "bg-blue-500", description: "Patients identified as potential matches" },
    { label: "Contacted", value: funnel.contacted, color: "bg-indigo-500", description: "Patients reached out to" },
    { label: "Screened", value: funnel.screened, color: "bg-purple-500", description: "Completed screening process" },
    { label: "Eligible", value: funnel.eligible, color: "bg-green-500", description: "Meets all eligibility criteria" },
    { label: "Enrolled", value: funnel.enrolled, color: "bg-emerald-600", description: "Successfully enrolled in trial" },
  ];

  const maxValue = Math.max(...stages.map((s) => s.value), 1);
  const totalPipeline = stages.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="bg-white rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Recruitment Funnel</h3>
        <span className="text-xs text-gray-400">{totalPipeline} total</span>
      </div>
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div key={stage.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600" title={stage.description}>{stage.label}</span>
              <span className="font-medium">{stage.value}</span>
            </div>
            <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
              <div
                className={`h-full ${stage.color} transition-all duration-500`}
                style={{ width: `${(stage.value / maxValue) * 100}%` }}
              />
              {stage.value > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  {Math.round((stage.value / Math.max(totalPipeline, 1)) * 100)}%
                </span>
              )}
            </div>
            {index < stages.length - 1 && stages[index + 1].value > 0 && (
              <div className="text-xs text-gray-400 mt-1 text-right">
                {index === 0 && `${conversions.interestedToContacted}% moved to contacted`}
                {index === 1 && `${conversions.contactedToScreened}% completed screening`}
                {index === 2 && `${conversions.screenedToEligible}% found eligible`}
                {index === 3 && `${conversions.eligibleToEnrolled}% enrolled`}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Overall Conversion Rate</span>
          <span className={`font-semibold ${conversions.overallConversion >= 10 ? 'text-emerald-600' : conversions.overallConversion >= 5 ? 'text-yellow-600' : 'text-gray-600'}`}>
            {conversions.overallConversion}%
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          From potential match to enrolled
        </p>
      </div>
    </div>
  );
}

// Trial performance table
function TrialPerformanceTable({ trials }: { trials: TrialMetrics[] }) {
  return (
    <div className="bg-white rounded-2xl border">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Trial Performance</h3>
        {trials.length > 0 && (
          <span className="text-xs text-gray-400">{trials.length} trial{trials.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50">
              <th className="px-4 py-3 font-medium">Trial</th>
              <th className="px-4 py-3 font-medium text-center">Potential</th>
              <th className="px-4 py-3 font-medium text-center">Eligible</th>
              <th className="px-4 py-3 font-medium text-center">Contacted</th>
              <th className="px-4 py-3 font-medium text-center">Enrolled</th>
              <th className="px-4 py-3 font-medium text-right">Conversion</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trials.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <BarChart3 className="h-8 w-8 text-gray-300" />
                    <div className="text-gray-500">No trial data yet</div>
                    <div className="text-xs text-gray-400">
                      Add trials and match patients to see performance metrics
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              trials.map((trial) => (
                <tr key={trial.nctId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium truncate max-w-[250px]" title={trial.title}>{trial.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{trial.nctId}</span>
                      {trial.status && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          trial.status === 'Recruiting' ? 'bg-green-100 text-green-700' :
                          trial.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {trial.status}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-blue-600 font-medium">{trial.interested || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-green-600 font-medium">{trial.eligible || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-indigo-600 font-medium">{trial.contacted || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-emerald-600 font-medium">{trial.enrolled || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        trial.conversionRate >= 20
                          ? "bg-emerald-100 text-emerald-700"
                          : trial.conversionRate >= 10
                          ? "bg-yellow-100 text-yellow-700"
                          : trial.conversionRate > 0
                          ? "bg-gray-100 text-gray-700"
                          : "bg-gray-50 text-gray-400"
                      }`}
                    >
                      {trial.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Analytics(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.userId || "";
  const [summary, setSummary] = React.useState<AnalyticsSummary | null>(null);
  const [trials, setTrials] = React.useState<TrialMetrics[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);

      const [summaryResult, trialsResult] = await Promise.all([
        getAnalyticsSummary(userId),
        getTrialPerformance(userId),
      ]);

      if (summaryResult.ok && summaryResult.summary) {
        setSummary(summaryResult.summary);
      }

      if (trialsResult.ok && trialsResult.trials) {
        setTrials(trialsResult.trials);
      }

      setLoading(false);
    };

    loadData();
  }, [userId]);

  const handleExport = async (dataType: "pipeline" | "appointments" | "trials") => {
    setExporting(dataType);
    try {
      const result = await exportData(userId, dataType, "csv");
      if (result.ok && result.csv && result.filename) {
        downloadCSV(result.csv, result.filename);
      }
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <SiteHeader />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Analytics</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track your recruitment performance and trial metrics
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport("pipeline")}
              disabled={exporting !== null}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting === "pipeline" ? "Exporting..." : "Export Patients"}
            </button>
            <button
              onClick={() => handleExport("trials")}
              disabled={exporting !== null}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting === "trials" ? "Exporting..." : "Export Trials"}
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{summary?.totalTrials || 0}</div>
                <div className="text-xs text-gray-500">Total Trials</div>
                {(summary?.activeTrials || 0) > 0 && (
                  <div className="text-xs text-emerald-600 mt-0.5">
                    {summary?.activeTrials} active
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{summary?.totalPatients || 0}</div>
                <div className="text-xs text-gray-500">Total Patients</div>
                {(summary?.customPatients?.totalPatients || 0) > 0 && (
                  <div className="text-xs text-purple-600 mt-0.5">
                    {summary?.customPatients?.totalPatients} from custom DBs
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {summary?.customPatients?.totalMatches || 0}
                </div>
                <div className="text-xs text-gray-500">Patient Matches</div>
                {(summary?.customPatients?.matchesByStatus?.enrolled || 0) > 0 && (
                  <div className="text-xs text-emerald-600 mt-0.5">
                    {summary?.customPatients?.matchesByStatus?.enrolled} enrolled
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {summary?.appointmentsThisWeek || 0}
                </div>
                <div className="text-xs text-gray-500">Appointments This Week</div>
                {(summary?.appointmentsToday || 0) > 0 && (
                  <div className="text-xs text-orange-600 mt-0.5">
                    {summary?.appointmentsToday} today
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Patient Database Stats */}
        {(summary?.customPatients?.totalDatabases || 0) > 0 && (
          <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Database className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Custom Patient Databases</div>
                  <div className="text-xs text-gray-500">
                    {summary?.customPatients?.totalDatabases} database{(summary?.customPatients?.totalDatabases || 0) !== 1 ? 's' : ''} uploaded
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {summary?.customPatients?.matchesByStatus?.potential || 0}
                  </div>
                  <div className="text-xs text-gray-500">Potential</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-emerald-600">
                    {summary?.customPatients?.matchesByStatus?.eligible || 0}
                  </div>
                  <div className="text-xs text-gray-500">Eligible</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {summary?.customPatients?.matchesByStatus?.contacted || 0}
                  </div>
                  <div className="text-xs text-gray-500">Contacted</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600">
                    {summary?.customPatients?.matchesByStatus?.enrolled || 0}
                  </div>
                  <div className="text-xs text-gray-500">Enrolled</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="mt-6 grid lg:grid-cols-3 gap-6">
          {/* Enrollment funnel */}
          <div className="lg:col-span-1">
            {summary && <EnrollmentFunnel funnel={summary.enrollmentFunnel} />}
          </div>

          {/* Recent activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">Recent Activity</h3>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
              <div className="space-y-3">
                {summary?.recentActivity && summary.recentActivity.length > 0 ? (
                  summary.recentActivity.slice(0, 8).map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <ArrowRight className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <div className="text-sm">{formatActivity(activity)}</div>
                          {activity.resource_id && (
                            <div className="text-xs text-gray-500">{activity.resource_id}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trial performance */}
        <div className="mt-6">
          <TrialPerformanceTable trials={trials} />
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <Link to="/providers/dashboard" className="hover:underline">
            Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
