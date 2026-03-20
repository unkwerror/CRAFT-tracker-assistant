import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET(_request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const issueKey = params?.key;
  if (!issueKey) return NextResponse.json({ error: 'Issue key required' }, { status: 400 });

  try {
    const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
    const transitions = await tracker.getIssueTransitions(issueKey);
    const normalized = (transitions || []).map((t) => ({
      id: t.id,
      key: t.key,
      display: t.display,
      to: t.to?.key,
      toDisplay: t.to?.display,
    }));
    return NextResponse.json({ transitions: normalized });
  } catch (error) {
    console.error('Transitions error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const issueKey = params?.key;
  if (!issueKey) return NextResponse.json({ error: 'Issue key required' }, { status: 400 });

  const { transitionId, comment } = await request.json();
  if (!transitionId) return NextResponse.json({ error: 'transitionId is required' }, { status: 400 });

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    const result = await tracker.executeTransition(issueKey, transitionId, comment);
    return NextResponse.json({ success: true, issue: result });
  } catch (error) {
    console.error('Transition execution error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
