import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { isDbConnected, getAllWidgets, getWidgetAccessMatrix, setWidgetAccess, logAction } from '@/lib/db.mjs';

async function checkAdmin() {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated', status: 401 };
  if (!['exdir', 'admin'].includes(session.role)) return { error: 'Forbidden', status: 403 };
  return { session };
}

// GET /api/admin/widgets — all widgets + access matrix
export async function GET() {
  const auth = await checkAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDbConnected()) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  try {
    const widgets = await getAllWidgets();
    const matrix = await getWidgetAccessMatrix();

    // Group matrix by user
    const byUser = {};
    for (const row of matrix) {
      if (!byUser[row.user_id]) {
        byUser[row.user_id] = { user_id: row.user_id, name: row.name, role: row.role, widgets: {} };
      }
      byUser[row.user_id].widgets[row.widget_id] = {
        enabled: row.enabled,
        settings: row.settings || {},
      };
    }

    return NextResponse.json({
      widgets,
      users: Object.values(byUser),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/widgets — grant/revoke widget access for a user
export async function PATCH(request) {
  const auth = await checkAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDbConnected()) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { userId, widgetId, enabled } = await request.json();

  if (!userId || !widgetId || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'userId, widgetId, and enabled (boolean) are required' }, { status: 400 });
  }

  try {
    const result = await setWidgetAccess(userId, widgetId, enabled, auth.session.uid);
    await logAction(
      auth.session.uid,
      enabled ? 'widget_granted' : 'widget_revoked',
      'widget',
      widgetId,
      null,
      { user_id: userId, enabled }
    );
    return NextResponse.json({ success: true, access: result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
