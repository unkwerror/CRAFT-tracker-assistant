import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

function parseSprintsFlag(request) {
  const { searchParams } = new URL(request.url);
  const value = (searchParams.get('sprints') || '').toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = params || {};
  if (!id) return jsonError('Board id required', 400);

  const includeSprints = parseSprintsFlag(request);
  const { session } = auth;
  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const board = await tracker.boards.get(id);
    const sprints = includeSprints ? await tracker.boards.getSprints(id) : [];

    return jsonOk({
      board: board || null,
      sprints: Array.isArray(sprints) ? sprints : [],
    });
  } catch (err) {
    console.error('Tracker board details error:', err.message);
    return jsonError(err.message, 502);
  }
}
