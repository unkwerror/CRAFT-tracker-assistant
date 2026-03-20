// ═══ /api/tracker/issues/[key] — одна задача ═══

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const key = params?.key;
  if (!key) {
    return NextResponse.json({ error: 'Issue key required' }, { status: 400 });
  }

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    const issue = await tracker.getIssue(key);
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }
    return NextResponse.json({ issue: normalizeIssue(issue) });
  } catch (err) {
    console.error('Issue GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const key = params?.key;
  if (!key) {
    return NextResponse.json({ error: 'Issue key required' }, { status: 400 });
  }

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    const body = await request.json();
    const issue = await tracker.updateIssue(key, body);
    return NextResponse.json({ issue: normalizeIssue(issue) });
  } catch (err) {
    console.error('Issue PATCH error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
