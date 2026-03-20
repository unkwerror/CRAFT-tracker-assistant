// ═══ /api/tracker/tasks — задачи из Яндекс Трекера ═══

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queue = searchParams.get('queue');    // CRM, PROJ, DOCS, HR
  const status = searchParams.get('status');
  const type = searchParams.get('type');      // my | overdue | stale | no_deadline
  const assigneeMe = searchParams.get('assigneeMe') !== 'false'; // для CRM: false = все лиды

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    let tasks;

    switch (type) {
      case 'overdue':
        tasks = await tracker.getOverdueTasks();
        break;
      case 'stale':
        tasks = await tracker.getStaleTasks(14);
        break;
      case 'no_deadline':
        tasks = await tracker.getTasksWithoutDeadline();
        break;
      default:
        if (queue) {
          // CRM: все лиды (assigneeMe=false), PROJ: только мои
          tasks = await tracker.getQueueTasks(queue, {
            assigneeMe: queue === 'CRM' ? false : assigneeMe,
            status: status || null,
          });
        } else {
          tasks = await tracker.getMyTasks(status);
        }
    }

    const now = new Date();
    const normalized = (tasks || []).map(raw => {
      const t = normalizeIssue(raw);
      if (type === 'overdue' && t.deadline) {
        t.days = Math.max(0, Math.round((now - new Date(t.deadline)) / 86400000));
      } else if (type === 'stale' && t.updatedAt) {
        t.days = Math.round((now - new Date(t.updatedAt)) / 86400000);
      } else if (type === 'no_deadline') {
        t.days = t.createdAt ? Math.round((now - new Date(t.createdAt)) / 86400000) : null;
      }
      return t;
    });
    return NextResponse.json({ tasks: normalized, count: normalized.length });

  } catch (error) {
    console.error('Tracker API error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
