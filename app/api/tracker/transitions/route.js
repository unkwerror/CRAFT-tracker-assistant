import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const issueKey = searchParams.get('issueKey');
  if (!issueKey) return NextResponse.json({ error: 'issueKey required' }, { status: 400 });

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
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
    console.error('Transitions API error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { issueKey, transitionId, comment } = await request.json();
  if (!issueKey || !transitionId) {
    return NextResponse.json({ error: 'issueKey and transitionId required' }, { status: 400 });
  }

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    await tracker.executeTransition(issueKey, transitionId, comment);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Transition execute error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
