import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const key = params?.key;
  if (!key) return NextResponse.json({ error: 'Issue key required' }, { status: 400 });

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    const comments = await tracker.getComments(key);
    const normalized = (comments || []).map(c => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      createdBy: c.createdBy?.display || c.createdBy?.id,
      type: c.type,
    }));
    return NextResponse.json({ comments: normalized });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const key = params?.key;
  if (!key) return NextResponse.json({ error: 'Issue key required' }, { status: 400 });

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    const { text, summonees } = await request.json();
    if (!text?.trim()) return NextResponse.json({ error: 'Text required' }, { status: 400 });

    const comment = await tracker.addComment(key, text.trim(), summonees);
    return NextResponse.json({
      comment: {
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt,
        createdBy: comment.createdBy?.display,
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
