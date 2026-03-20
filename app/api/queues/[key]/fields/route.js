import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { key } = params || {};
  if (!key) return jsonError('Queue key required', 400);

  const { session } = auth;
  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const fields = await tracker.queues.getLocalFields(key);
    return jsonOk({ fields: Array.isArray(fields) ? fields : [] });
  } catch (err) {
    console.error(`Queue ${key} local fields error:`, err.message);
    return jsonError(err.message, 502);
  }
}
