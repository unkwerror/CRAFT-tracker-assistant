import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { isDbConnected, getAllWidgets, query, logAction } from '@/lib/db.mjs';

async function checkAdmin() {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated', status: 401 };
  if (!['exdir', 'admin'].includes(session.role)) return { error: 'Forbidden', status: 403 };
  return { session };
}

// GET /api/admin/widgets
export async function GET() {
  const auth = await checkAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDbConnected()) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  try {
    const widgets = await getAllWidgets();
    return NextResponse.json({ widgets });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/widgets — update allowed_roles or default_for for a widget
export async function PATCH(request) {
  const auth = await checkAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDbConnected()) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { widgetKey, field, roles } = await request.json();

  if (!widgetKey || !field || !Array.isArray(roles)) {
    return NextResponse.json({ error: 'widgetKey, field, and roles[] required' }, { status: 400 });
  }
  if (!['allowed_roles', 'default_for'].includes(field)) {
    return NextResponse.json({ error: 'field must be allowed_roles or default_for' }, { status: 400 });
  }

  try {
    await query(`UPDATE widgets SET ${field} = $2 WHERE key = $1`, [widgetKey, JSON.stringify(roles)]);
    await logAction(auth.session.uid, 'widget_access_updated', 'widget', widgetKey, null, { field, roles });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
