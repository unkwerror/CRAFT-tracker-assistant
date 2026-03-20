// ═══ /api/queues/[key]/fields — поля очереди ═══

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { getQueueFields } from '@/lib/db.mjs';

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
    const fields = await getQueueFields(key);
    return NextResponse.json({ fields });
  } catch (err) {
    console.error('Queue fields API error:', err.message);
    return NextResponse.json({ fields: [] });
  }
}
