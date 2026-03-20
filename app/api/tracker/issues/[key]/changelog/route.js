import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const key = params?.key;
  if (!key) return NextResponse.json({ error: 'Issue key required' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const field = searchParams.get('field') || undefined;
  const perPage = parseInt(searchParams.get('perPage') || '50', 10);

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    const changelog = await tracker.getChangelog(key, { field, perPage });
    return NextResponse.json({ changelog });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
