// ═══ /api/tracker/tasks — задачи из Яндекс Трекера ═══

import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';
import { getLocalIssues, getLocalIssuesByQueue, dbRowToNormalizedIssue } from '@/lib/db.mjs';

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const { searchParams } = new URL(request.url);
  const queue = searchParams.get('queue');    // CRM, PROJ, DOCS, HR
  const status = searchParams.get('status');
  const type = searchParams.get('type');      // my | overdue | stale | no_deadline
  const assigneeMe = searchParams.get('assigneeMe') !== 'false'; // для CRM: false = все лиды

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  const sessionAssigneeId = String(session?.tracker_login ?? session?.uid ?? '');

  try {
    let normalized = [];
    let source = 'tracker';

    switch (type) {
      case 'overdue':
        if (!tracker.enabled) return jsonError('Tracker not configured', 503);
        normalized = (await tracker.getOverdueTasks() || []).map(normalizeIssue);
        break;
      case 'stale':
        if (!tracker.enabled) return jsonError('Tracker not configured', 503);
        normalized = (await tracker.getStaleTasks(14) || []).map(normalizeIssue);
        break;
      case 'no_deadline':
        if (!tracker.enabled) return jsonError('Tracker not configured', 503);
        normalized = (await tracker.getTasksWithoutDeadline() || []).map(normalizeIssue);
        break;
      default:
        if (queue) {
          let local = [];
          try {
            local = (await getLocalIssuesByQueue(queue)).map(dbRowToNormalizedIssue);
          } catch (e) {
            console.error('Local queue tasks read failed:', e.message);
          }
          if (status) {
            local = local.filter((issue) => issue.statusKey === status || issue.status === status);
          }
          if (queue !== 'CRM' && assigneeMe && sessionAssigneeId) {
            local = local.filter((issue) => String(issue.assigneeId || '') === sessionAssigneeId);
          }

          if (local.length > 0) {
            normalized = local;
            source = 'local';
            break;
          }

          if (!tracker.enabled) return jsonError('Tracker not configured', 503);
          const tasks = await tracker.getQueueTasks(queue, {
            assigneeMe: queue === 'CRM' ? false : assigneeMe,
            status: status || null,
          });
          normalized = (tasks || []).map(normalizeIssue);
        } else {
          let local = [];
          if (sessionAssigneeId) {
            try {
              local = (await getLocalIssues({
                assigneeId: sessionAssigneeId,
                statusKey: status || undefined,
                limit: 500,
                offset: 0,
              })).map(dbRowToNormalizedIssue);
            } catch (e) {
              console.error('Local my tasks read failed:', e.message);
            }
          }

          if (status) {
            local = local.filter((issue) => issue.statusKey === status || issue.status === status);
          }

          if (local.length > 0) {
            normalized = local;
            source = 'local';
            break;
          }

          if (!tracker.enabled) return jsonError('Tracker not configured', 503);
          const tasks = await tracker.getMyTasks(status);
          normalized = (tasks || []).map(normalizeIssue);
        }
    }

    const now = new Date();
    const tasksWithMetrics = normalized.map((t) => {
      if (type === 'overdue' && t.deadline) {
        t.days = Math.max(0, Math.round((now - new Date(t.deadline)) / 86400000));
      } else if (type === 'stale' && t.updatedAt) {
        t.days = Math.round((now - new Date(t.updatedAt)) / 86400000);
      } else if (type === 'no_deadline') {
        t.days = t.createdAt ? Math.round((now - new Date(t.createdAt)) / 86400000) : null;
      }
      return t;
    });
    return jsonOk({ tasks: tasksWithMetrics, count: tasksWithMetrics.length, source });

  } catch (error) {
    console.error('Tracker tasks error:', error.message);
    return jsonError(error.message, 502);
  }
}
