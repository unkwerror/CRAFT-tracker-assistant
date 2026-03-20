// ═══ /api/dashboard/layout — раскладка виджетов пользователя ═══

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { isDbConnected, getWidgetsForRole, getDefaultWidgetsForRole, getDashboardLayout, saveDashboardLayout } from '@/lib/db.mjs';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!isDbConnected()) {
    return NextResponse.json({ layout: [], enabledKeys: [], widgetMeta: {} });
  }

  try {
    const available = await getWidgetsForRole(session.role);
    const savedLayout = await getDashboardLayout(session.uid);
    const enabledKeys = available.map(w => w.key);

    let layout;
    if (savedLayout && savedLayout.length > 0) {
      layout = savedLayout.filter(key => enabledKeys.includes(key));
    } else {
      layout = await getDefaultWidgetsForRole(session.role);
    }

    const widgetMeta = {};
    for (const w of available) {
      widgetMeta[w.key] = {
        title: w.title,
        description: w.description,
        size: w.size,
        component: w.component,
        defaultSettings: w.default_settings || {},
      };
    }

    return NextResponse.json({ layout, enabledKeys, widgetMeta });
  } catch (err) {
    console.error('Layout API error:', err.message);
    return NextResponse.json({ layout: [], enabledKeys: [], widgetMeta: {} });
  }
}

export async function PATCH(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
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
