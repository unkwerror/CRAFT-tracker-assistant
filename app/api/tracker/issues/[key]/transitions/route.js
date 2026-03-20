import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';
import { insertCrmEvent } from '@/lib/db.mjs';

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const issueKey = params?.key;
  if (!issueKey) return jsonError('Issue key required', 400);

  try {
    const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
    if (!tracker.enabled) return jsonError('Tracker not configured', 503);
    const transitions = await tracker.getIssueTransitions(issueKey);
    const resolveToKey = (t) => {
      if (t?.to?.key) return t.to.key;
      if (typeof t?.to === 'string') return t.to;
      if (t?.toStatus?.key) return t.toStatus.key;
      return null;
    };
    const resolveToDisplay = (t) => {
      if (t?.to?.display) return t.to.display;
      if (t?.toStatus?.display) return t.toStatus.display;
      if (typeof t?.to === 'string') return t.to;
      return t?.display || null;
    };
    const normalized = (transitions || []).map((t) => ({
      id: t.id,
      key: t.key,
      display: t.display,
      to: resolveToKey(t),
      toDisplay: resolveToDisplay(t),
    }));
    return jsonOk({ transitions: normalized });
  } catch (error) {
    console.error('Transitions error:', error.message);
    return jsonError(error.message, 502);
  }
}

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const issueKey = params?.key;
  if (!issueKey) return jsonError('Issue key required', 400);

  const body = await request.json();
  const { transitionId, comment } = body || {};
  if (!transitionId) return jsonError('transitionId is required', 400);

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const result = await tracker.executeTransition(issueKey, transitionId, comment);

    try {
      const userId = session?.uid ?? session?.userId ?? null;
      await insertCrmEvent(issueKey, 'transition', userId, {
        transitionId,
        from: body?.from || null,
        to: body?.to || null,
      });
    } catch (e) {
      console.error('Failed to log CRM event:', e.message);
    }

    return jsonOk({ success: true, issue: result });
  } catch (error) {
    console.error('Transition execution error:', error.message);
    return jsonError(error.message, 502);
  }
}
