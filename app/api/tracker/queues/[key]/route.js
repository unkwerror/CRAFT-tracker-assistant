import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { hasPermission } from '@/lib/api-helpers.mjs';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';

const QUEUE_PERMISSION_MAP = {
  CRM: 'crm:read', PROJ: 'proj:read', DOCS: 'docs:read', HR: 'hr:read',
};

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { key } = params;
  const requiredPerm = QUEUE_PERMISSION_MAP[key.toUpperCase()];
  if (requiredPerm) {
    const hasPerm = await hasPermission(session, requiredPerm);
    if (!hasPerm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const assignee = searchParams.get('assignee');
  const perPage = parseInt(searchParams.get('perPage') || '100');

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  if (!tracker.enabled) {
    return NextResponse.json({ tasks: [], count: 0, queue: key, warning: 'Tracker not configured' });
  }

  try {
    const tasks = await tracker.getQueueTasks(key, {
      assigneeMe: assignee === 'me',
      status: status || null,
      perPage,
    });

    const normalized = (tasks || []).map(normalizeIssue);
    return NextResponse.json({ tasks: normalized, count: normalized.length, queue: key });
  } catch (error) {
    const msg = error.message || '';
    if (msg.includes('404') || msg.includes('not found') || msg.includes('Queue not found')) {
      return NextResponse.json({
        tasks: [], count: 0, queue: key,
        warning: `Очередь ${key} не найдена в Трекере. Создайте её вручную.`,
      });
    }
    console.error(`Tracker queue ${key} error:`, msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
