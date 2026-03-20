// ═══ /api/tracker/issues/[key] — одна задача ═══

import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';
import { getLocalIssueByKey, dbRowToNormalizedIssue, upsertIssue } from '@/lib/db.mjs';

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const key = params?.key;
  if (!key) {
    return jsonError('Issue key required', 400);
  }

  try {
    try {
      const localIssue = await getLocalIssueByKey(key);
      if (localIssue) {
        return jsonOk({ issue: dbRowToNormalizedIssue(localIssue), source: 'local' });
      }
    } catch (e) {
      console.error('Local issue read failed:', e.message);
    }

    const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
    if (!tracker.enabled) return jsonError('Tracker not configured', 503);

    const issue = await tracker.getIssue(key);
    if (!issue) {
      return jsonError('Issue not found', 404);
    }
    return jsonOk({ issue: normalizeIssue(issue), source: 'tracker' });
  } catch (err) {
    console.error('Issue GET error:', err.message);
    return jsonError(err.message, 502);
  }
}

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const key = params?.key;
  if (!key) {
    return jsonError('Issue key required', 400);
  }

  try {
    const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
    if (!tracker.enabled) return jsonError('Tracker not configured', 503);

    const body = await request.json();
    const issue = await tracker.updateIssue(key, body);
    const normalized = normalizeIssue(issue);

    try {
      await upsertIssue(normalized);
    } catch (e) {
      console.error('Write-through to local DB failed:', e.message);
    }

    return jsonOk({ issue: normalized });
  } catch (err) {
    console.error('Issue PATCH error:', err.message);
    return jsonError(err.message, 502);
  }
}
