import { requireAuth, hasPermission, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';
import { getLocalIssuesByQueue, dbRowToNormalizedIssue } from '@/lib/db.mjs';

const QUEUE_PERMISSION_MAP = {
  CRM: 'crm:read', PROJ: 'proj:read', DOCS: 'docs:read', HR: 'hr:read',
};

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const { key } = params || {};
  if (!key) return jsonError('Queue key required', 400);
  const requiredPerm = QUEUE_PERMISSION_MAP[key.toUpperCase()];
  if (requiredPerm) {
    const hasPerm = await hasPermission(session, requiredPerm);
    if (!hasPerm) return jsonError('Forbidden', 403);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const assignee = searchParams.get('assignee');
  const parsedPerPage = Number.parseInt(searchParams.get('perPage') || '100', 10);
  const perPage = Number.isFinite(parsedPerPage) && parsedPerPage > 0 ? parsedPerPage : 100;
  const sessionAssigneeId = String(session?.tracker_login ?? session?.uid ?? '');

  try {
    let local = [];
    try {
      local = (await getLocalIssuesByQueue(key)).map(dbRowToNormalizedIssue);
    } catch (e) {
      console.error(`Local queue ${key} read failed:`, e.message);
    }
    if (status) {
      local = local.filter((issue) => issue.statusKey === status || issue.status === status);
    }
    if (assignee === 'me' && sessionAssigneeId) {
      local = local.filter((issue) => String(issue.assigneeId || '') === sessionAssigneeId);
    }
    if (Number.isFinite(perPage) && perPage > 0) {
      local = local.slice(0, perPage);
    }

    if (local.length > 0) {
      return jsonOk({ tasks: local, count: local.length, queue: key, source: 'local' });
    }

    const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
    if (!tracker.enabled) {
      return jsonError('Tracker not configured', 503);
    }

    const tasks = await tracker.getQueueTasks(key, {
      assigneeMe: assignee === 'me',
      status: status || null,
      perPage,
    });

    const normalized = (tasks || []).map(normalizeIssue);
    return jsonOk({ tasks: normalized, count: normalized.length, queue: key, source: 'tracker' });
  } catch (error) {
    const msg = error.message || '';
    if (msg.includes('404') || msg.includes('not found') || msg.includes('Queue not found')) {
      return jsonOk({
        tasks: [], count: 0, queue: key,
        source: 'tracker',
        warning: `Очередь ${key} не найдена в Трекере. Создайте её вручную.`,
      });
    }
    console.error(`Tracker queue ${key} error:`, msg);
    return jsonError(msg, 502);
  }
}
