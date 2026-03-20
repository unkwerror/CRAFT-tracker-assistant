import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;
  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const projects = await tracker.projects.list();
    return jsonOk({ projects });
  } catch (err) {
    console.error('Tracker projects list error:', err.message);
    return jsonError(err.message, 502);
  }
}
