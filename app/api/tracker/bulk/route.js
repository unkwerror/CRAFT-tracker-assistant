import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function POST(request) {
  const auth = await requirePermission('crm:write');
  if (auth.error) return auth.error;

  const { session } = auth;
  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const { action, issueKeys, values, transitionId } = await request.json();

    if (!issueKeys || !Array.isArray(issueKeys) || issueKeys.length === 0) {
      return jsonError('issueKeys array required');
    }

    let result;
    if (action === 'update' && values) {
      result = await tracker.bulkUpdate(issueKeys, values);
    } else if (action === 'transition' && transitionId) {
      result = await tracker.bulkTransition(issueKeys, transitionId);
    } else {
      return jsonError('action must be "update" or "transition" with corresponding data');
    }

    return jsonOk({ success: true, operationId: result?.id, status: result?.status });
  } catch (err) {
    return jsonError(err.message, 502);
  }
}
