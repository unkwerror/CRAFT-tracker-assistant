// ═══ /api/tracker/tasks — получить задачи текущего пользователя ═══

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queue = searchParams.get('queue');    // опционально: CRM, PROJ, DOCS, HR
  const status = searchParams.get('status');  // опционально: inProgress, open, etc.
  const type = searchParams.get('type');      // my | overdue | stale | no_deadline

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
          const filter = { assignee: 'me' };
          if (status) filter.status = status;
          tasks = await tracker.getQueueTasks(queue, filter);
        } else {
          tasks = await tracker.getMyTasks(status);
        }
    }

    // Нормализовать данные для фронтенда
    const normalized = (tasks || []).map(t => ({
      key: t.key,
      summary: t.summary,
      status: t.status?.display,
      statusKey: t.status?.key,
      priority: t.priority?.display,
      type: t.type?.display,
      deadline: t.deadline,
      assignee: t.assignee?.display,
      queue: t.queue?.key,
      components: (t.components || []).map(c => c.display),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      url: `https://tracker.yandex.ru/${t.key}`,
    }));

    return NextResponse.json({ tasks: normalized, count: normalized.length });

  } catch (error) {
    console.error('Tracker API error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
