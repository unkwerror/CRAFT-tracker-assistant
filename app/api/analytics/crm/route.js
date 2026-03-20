import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';
import { buildAnalyticsBundle } from '@/lib/analytics.mjs';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;
  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  if (!tracker.enabled) {
    return jsonError('Tracker not configured', 503);
  }

  try {
    const raw = await tracker.getQueueTasks('CRM', { perPage: 200 });
    const leads = (Array.isArray(raw) ? raw : []).map(normalizeIssue);
    const analytics = buildAnalyticsBundle(leads);
    return jsonOk({ analytics, leadsCount: leads.length });
  } catch (err) {
    console.error('CRM analytics error:', err.message);
    return jsonError(err.message, 502);
  }
}
