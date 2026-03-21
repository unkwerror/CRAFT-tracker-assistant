// ═══ /api/dashboard/layout — раскладка виджетов пользователя ═══

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import {
  isDbConnected,
  getWidgetsForRole,
  getDefaultWidgetsForRole,
  getDashboardLayout,
  saveDashboardLayout,
  getWidgetPreferences,
  upsertWidgetPreference,
} from '@/lib/db.mjs';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!isDbConnected()) {
    return NextResponse.json({ layout: [], enabledKeys: [], widgetMeta: {}, preferences: {} });
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

    // Fetch per-user widget preferences; gracefully degrade if table doesn't exist yet
    let preferences = {};
    try {
      preferences = await getWidgetPreferences(session.uid);
    } catch {
      // Table may not exist before migration — non-fatal
    }

    return NextResponse.json({ layout, enabledKeys, widgetMeta, preferences });
  } catch (err) {
    console.error('Layout API error:', err.message);
    return NextResponse.json({ layout: [], enabledKeys: [], widgetMeta: {}, preferences: {} });
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
    const body = await request.json();
    const { layout, preferences } = body;

    if (layout !== undefined) {
      if (!Array.isArray(layout)) {
        return NextResponse.json({ error: 'layout must be an array' }, { status: 400 });
      }
      await saveDashboardLayout(session.uid, layout);
    }

    // preferences: { widgetKey: { accentColor?, frameStyle?, collapsed? } }
    if (preferences && typeof preferences === 'object') {
      await Promise.all(
        Object.entries(preferences).map(([widgetKey, settings]) =>
          upsertWidgetPreference(session.uid, widgetKey, settings).catch(() => {})
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
