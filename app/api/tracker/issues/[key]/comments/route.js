import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';
import { getIssueComments, upsertIssueComment, upsertManyIssueComments } from '@/lib/db.mjs';

const COMMENTS_LOCAL_TTL_MS = 90_000;

function normalizeTrackerComment(comment) {
  return {
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    createdBy: comment.createdBy?.display || comment.createdBy?.id || null,
    type: comment.type ?? null,
  };
}

function normalizeDbComment(row) {
  return {
    id: row.tracker_id || row.id,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    createdBy: row.author_display || null,
    type: null,
  };
}

function isLocalCommentsFresh(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  const latestSynced = rows.reduce((max, row) => {
    const value = row?.synced_at ? new Date(row.synced_at).getTime() : 0;
    return value > max ? value : max;
  }, 0);
  return latestSynced > 0 && Date.now() - latestSynced < COMMENTS_LOCAL_TTL_MS;
}

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const key = params?.key;
  if (!key) return jsonError('Issue key required', 400);

  try {
    let localRows = [];
    try {
      localRows = await getIssueComments(key);
    } catch (e) {
      console.error('Comments local read error:', e.message);
    }

    const localNormalized = localRows.map(normalizeDbComment);
    const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
    const hasFreshLocal = isLocalCommentsFresh(localRows);

    if (hasFreshLocal || !tracker.enabled) {
      if (!tracker.enabled && localNormalized.length === 0) {
        return jsonError('Tracker not configured', 503);
      }
      return jsonOk({ comments: localNormalized, source: 'local' });
    }

    try {
      const comments = await tracker.getComments(key);
      const normalized = (comments || []).map(normalizeTrackerComment);

      try {
        await upsertManyIssueComments(key, comments || []);
      } catch (e) {
        console.error('Comments cache refresh failed:', e.message);
      }

      return jsonOk({ comments: normalized, source: 'tracker' });
    } catch (err) {
      if (localNormalized.length > 0) {
        console.error('Comments tracker refresh failed, serving local cache:', err.message);
        return jsonOk({ comments: localNormalized, source: 'local' });
      }
      console.error('Comments GET error:', err.message);
      return jsonError(err.message, 502);
    }
  } catch (err) {
    console.error('Comments GET route error:', err.message);
    return jsonError(err.message, 500);
  }
}

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const key = params?.key;
  if (!key) return jsonError('Issue key required', 400);

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const { text, summonees } = await request.json();
    if (!text?.trim()) return jsonError('Text required', 400);

    const comment = await tracker.addComment(key, text.trim(), summonees);

    try {
      await upsertIssueComment(key, comment);
    } catch (e) {
      console.error('Comments write-through cache failed:', e.message);
    }

    const normalized = normalizeTrackerComment(comment);
    return jsonOk({
      comment: {
        id: normalized.id,
        text: normalized.text,
        createdAt: normalized.createdAt,
        createdBy: normalized.createdBy,
      },
      source: 'tracker',
    }, 201);
  } catch (err) {
    console.error('Comments POST error:', err.message);
    return jsonError(err.message, 502);
  }
}
