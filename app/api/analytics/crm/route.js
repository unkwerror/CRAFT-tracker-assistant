import { requireAuth, requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';
import {
  buildAnalyticsBundle,
  cohortAnalysis,
  managerPerformance,
  winLossAnalysis,
  segmentLeads,
  conversionByPeriod,
  calcVelocityFromChangelog,
  trainConversionModel,
  predictConversion,
  trainScoringModel,
  predictWithModel,
  forecastTimeSeries,
} from '@/lib/analytics.mjs';

export async function GET(request) {
  const auth = await requirePermission('crm:read');
  if (auth.error) return auth.error;

  const { session } = auth;
  const { searchParams } = new URL(request.url);
  const managerId = searchParams.get('managerId');
  const cohortMode = searchParams.get('cohort');
  const withChangelog = searchParams.get('changelog') === 'true';
  const withML = searchParams.get('ml') === 'true';

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const raw = await tracker.getQueueTasks('CRM', { perPage: 500 });
    let leads = (Array.isArray(raw) ? raw : []).map(normalizeIssue);

    if (managerId) {
      leads = leads.filter(l => l.assignee === managerId || l.assigneeId === managerId);
    }

    const analytics = buildAnalyticsBundle(leads);

    if (cohortMode) {
      analytics.cohorts = cohortAnalysis(leads, cohortMode === 'quarter' ? 'quarter' : 'month');
    }

    if (withChangelog) {
      try {
        const changelogData = await Promise.all(
          leads.slice(0, 50).map(async (l) => {
            const changes = await tracker.getChangelog(l.key, { field: 'status', perPage: 20 });
            return { key: l.key, changes };
          })
        );
        analytics.velocityChangelog = calcVelocityFromChangelog(changelogData);
      } catch {
        analytics.velocityChangelog = null;
      }
    }

    if (withML) {
      try {
        const convModel = trainConversionModel(leads);
        if (convModel) {
          const activeLeads = leads.filter(l =>
            !['contract', 'projectOpened', 'rejected', 'closed'].includes(l.statusKey)
          );
          analytics.conversionPredictions = activeLeads.map(l => ({
            key: l.key,
            summary: l.summary,
            prediction: predictConversion(convModel, l),
          }));
        }

        const scoringModel = trainScoringModel(leads);
        if (scoringModel) {
          const activeLeads = leads.filter(l =>
            !['contract', 'projectOpened', 'rejected', 'closed'].includes(l.statusKey)
          );
          analytics.mlScores = activeLeads.map(l => ({
            key: l.key,
            summary: l.summary,
            mlPrediction: predictWithModel(scoringModel, l),
          }));
        }
      } catch {
        analytics.conversionPredictions = null;
        analytics.mlScores = null;
      }
    }

    return jsonOk({ analytics, leadsCount: leads.length });
  } catch (err) {
    console.error('CRM analytics error:', err.message);
    return jsonError(err.message, 502);
  }
}
