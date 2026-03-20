import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { isDbConnected, getWidgetsForRole, getDefaultWidgetsForRole, getDashboardLayout, saveDashboardLayout } from '@/lib/db.mjs';

// GET /api/dashboard/layout
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (!isDbConnected()) {
    return NextResponse.json({ layout: [], enabledKeys: [] });
  }

  try {
    // Get widgets available for this role (from widgets.allowed_roles)
    const available = await getWidgetsForRole(session.role);
    const enabledKeys = available.map(w => w.key);

    // Get saved layout
    const savedLayout = await getDashboardLayout(session.uid);

    // If user has a saved layout, filter to only available widgets
    let layout;
    if (savedLayout && savedLayout.length > 0) {
      layout = savedLayout.filter(key => enabledKeys.includes(key));
    } else {
      // First visit: use defaults for this role
      layout = await getDefaultWidgetsForRole(session.role);
    }

    return NextResponse.json({ layout, enabledKeys });
  } catch (err) {
    console.error('Layout API error:', err.message);
    return NextResponse.json({ layout: [], enabledKeys: [] });
  }
}

// PATCH /api/dashboard/layout
export async function PATCH(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isDbConnected()) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

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
