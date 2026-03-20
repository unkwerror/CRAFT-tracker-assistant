import { requireAuth, hasPermission, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

const QUEUE_WRITE_PERMISSION = {
  CRM: 'crm:write', PROJ: 'proj:write', DOCS: 'docs:write', HR: 'hr:write',
};

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;
  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const body = await request.json();
    const { queue, summary, description, type, priority, assignee, fields } = body;

    if (!queue || !summary) {
      return jsonError('queue and summary are required', 400);
    }

    const requiredPerm = QUEUE_WRITE_PERMISSION[queue.toUpperCase()];
    if (requiredPerm) {
      const hasPerm = await hasPermission(session, requiredPerm);
      if (!hasPerm) return jsonError('Forbidden', 403);
    }

    const issue = await tracker.createIssue({ queue, summary, description, type, priority, assignee, fields });
    return jsonOk({
      success: true,
      issue: {
        key: issue.key,
        summary: issue.summary,
        status: issue.status?.display,
        statusKey: issue.status?.key,
        url: `https://tracker.yandex.ru/${issue.key}`,
      },
    }, 201);
  } catch (error) {
    console.error('Issue creation error:', error.message);
    return jsonError(error.message, 502);
  }
}
