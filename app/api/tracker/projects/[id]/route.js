import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = params || {};
  if (!id) return jsonError('Project id required', 400);

  const { session } = auth;
  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const [project, queues] = await Promise.all([
      tracker.projects.get(id),
      tracker.projects.getQueues(id),
    ]);

    return jsonOk({
      project: project || null,
      queues: Array.isArray(queues) ? queues : [],
    });
  } catch (err) {
    console.error('Tracker project details error:', err.message);
    return jsonError(err.message, 502);
  }
}
