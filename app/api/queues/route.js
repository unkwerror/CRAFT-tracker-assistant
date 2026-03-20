// ═══ /api/queues — конфигурация очередей из БД ═══

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { getAllQueues } from '@/lib/db.mjs';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const queues = await getAllQueues();
    return NextResponse.json({ queues });
  } catch (err) {
    console.error('Queues API error:', err.message);
    return NextResponse.json({ queues: [] });
  }
}
