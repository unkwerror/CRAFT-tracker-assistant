import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { isDbConnected, getDashboardLayout, saveDashboardLayout, getEnabledWidgetKeys } from '@/lib/db.mjs';

// GET /api/dashboard/layout — get user's widget layout
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (!isDbConnected()) {
    return NextResponse.json({ layout: [], source: 'no-db' });
  }

  try {
    const layout = await getDashboardLayout(session.uid);
    const enabledKeys = await getEnabledWidgetKeys(session.uid);

    return NextResponse.json({
      layout,
      enabledKeys,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/dashboard/layout — save user's widget layout
export async function PATCH(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (!isDbConnected()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  const { layout } = await request.json();

  if (!Array.isArray(layout)) {
    return NextResponse.json({ error: 'layout must be an array of widget keys' }, { status: 400 });
  }

  try {
    await saveDashboardLayout(session.uid, layout);
    return NextResponse.json({ success: true, layout });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
