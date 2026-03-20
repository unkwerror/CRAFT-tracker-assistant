import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { key } = params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const assignee = searchParams.get('assignee');
  const perPage = parseInt(searchParams.get('perPage') || '100');

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    const tasks = await tracker.getQueueTasks(key, {
      assigneeMe: assignee === 'me',
      status: status || null,
      perPage,
    });

    const normalized = (tasks || []).map(normalizeIssue);
    return NextResponse.json({ tasks: normalized, count: normalized.length, queue: key });
  } catch (error) {
    console.error(`Tracker queue ${key} error:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
