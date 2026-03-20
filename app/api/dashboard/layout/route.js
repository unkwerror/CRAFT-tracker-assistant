import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { isDbConnected, getDashboardLayout, saveDashboardLayout, getEnabledWidgetKeys, ensureUserWidgets } from '@/lib/db.mjs';

// GET /api/dashboard/layout
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (!isDbConnected()) {
    return NextResponse.json({ layout: [], enabledKeys: [], source: 'no-db' });
  }

  try {
    // Auto-initialize widgets if user has none
    await ensureUserWidgets(session.uid, session.role);

    const layout = await getDashboardLayout(session.uid);
    const enabledKeys = await getEnabledWidgetKeys(session.uid);

    return NextResponse.json({ layout, enabledKeys });
  } catch (err) {
    console.error('Layout API error:', err.message);
    return NextResponse.json({ layout: [], enabledKeys: [], error: err.message });
  }
}

// PATCH /api/dashboard/layout
export async function PATCH(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (!isDbConnected()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  try {
    const { layout } = await request.json();
    if (!Array.isArray(layout)) {
      return NextResponse.json({ error: 'layout must be an array' }, { status: 400 });
    }
    await saveDashboardLayout(session.uid, layout);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
