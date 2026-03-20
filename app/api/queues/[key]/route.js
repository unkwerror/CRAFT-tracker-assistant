// ═══ /api/queues/[key] — очередь с полями ═══

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { getQueueWithFields } from '@/lib/db.mjs';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const key = params?.key;
  if (!key) {
    return NextResponse.json({ error: 'Queue key required' }, { status: 400 });
  }

  try {
    const queue = await getQueueWithFields(key);
    if (!queue) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }
    return NextResponse.json({ queue });
  } catch (err) {
    console.error('Queue API error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
