import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';
import { buildAnalyticsBundle } from '@/lib/analytics.mjs';

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;
  const { searchParams } = new URL(request.url);
  const requested = (searchParams.get('widgets') || '').split(',').filter(Boolean);

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonOk({ stats: null, warning: 'Tracker not connected' });

  const result = {};

  try {
    const needsCRM = requested.some(w => ['kanban', 'funnel', 'analytics', 'stats'].includes(w)) || requested.length === 0;
    const needsPROJ = requested.includes('portfolio') || requested.length === 0;
    const needsMy = requested.includes('my_tasks') || requested.length === 0;

    const [crmRaw, projRaw, myRaw] = await Promise.all([
      needsCRM ? tracker.getQueueTasks('CRM', { perPage: 200 }).catch(() => []) : Promise.resolve([]),
      needsPROJ ? tracker.getQueueTasks('PROJ', { perPage: 100 }).catch(() => []) : Promise.resolve([]),
      needsMy ? tracker.getMyTasks().catch(() => []) : Promise.resolve([]),
    ]);

    const crmLeads = (Array.isArray(crmRaw) ? crmRaw : []).map(normalizeIssue);
    const projTasks = (Array.isArray(projRaw) ? projRaw : []).map(normalizeIssue);
    const myTasks = (Array.isArray(myRaw) ? myRaw : []).map(normalizeIssue);

    if (needsCRM) {
      result.crmLeads = crmLeads;
      result.analytics = buildAnalyticsBundle(crmLeads);
    }
    if (needsPROJ) result.projTasks = projTasks;
    if (needsMy) result.myTasks = myTasks;

    result.stats = {
      totalTasks: myTasks.length,
      crmCount: crmLeads.length,
      projCount: projTasks.length,
    };

    return jsonOk(result);
  } catch (err) {
    console.error('Dashboard data error:', err.message);
    return jsonError(err.message, 502);
  }
}
