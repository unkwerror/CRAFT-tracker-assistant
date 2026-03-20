import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { hasPermission } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

const QUEUE_WRITE_PERMISSION = {
  CRM: 'crm:write', PROJ: 'proj:write', DOCS: 'docs:write', HR: 'hr:write',
};

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { queue, summary, description, type, priority, assignee, fields } = body;

  if (!queue || !summary) {
    return NextResponse.json({ error: 'queue and summary are required' }, { status: 400 });
  }

  const requiredPerm = QUEUE_WRITE_PERMISSION[queue.toUpperCase()];
  if (requiredPerm) {
    const hasPerm = await hasPermission(session, requiredPerm);
    if (!hasPerm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    const issue = await tracker.createIssue({ queue, summary, description, type, priority, assignee, fields });
    return NextResponse.json({
      success: true,
      issue: {
        key: issue.key,
        summary: issue.summary,
        status: issue.status?.display,
        statusKey: issue.status?.key,
        url: `https://tracker.yandex.ru/${issue.key}`,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Issue creation error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
