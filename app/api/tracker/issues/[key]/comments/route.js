import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const key = params?.key;
  if (!key) return jsonError('Issue key required', 400);

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const comments = await tracker.getComments(key);
    const normalized = (comments || []).map(c => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      createdBy: c.createdBy?.display || c.createdBy?.id,
      type: c.type,
    }));
    return jsonOk({ comments: normalized });
  } catch (err) {
    console.error('Comments GET error:', err.message);
    return jsonError(err.message, 502);
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
    return jsonOk({
      comment: {
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt,
        createdBy: comment.createdBy?.display,
      },
    }, 201);
  } catch (err) {
    console.error('Comments POST error:', err.message);
    return jsonError(err.message, 502);
  }
}
