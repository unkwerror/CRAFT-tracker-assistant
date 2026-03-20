import { NextResponse } from 'next/server';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';
import { isDbConnected, query } from '@/lib/db.mjs';

const STAGE_ORDER = ['newLead', 'qualification', 'proposal', 'negotiation', 'contract', 'projectOpened'];

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDbConnected()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  const token = process.env.TRACKER_OAUTH_TOKEN;
  const orgId = process.env.TRACKER_ORG_ID;
  if (!token || !orgId) {
    return NextResponse.json({ error: 'Tracker not configured' }, { status: 503 });
  }

  const tracker = new TrackerClient(token, orgId);

  try {
    const raw = await tracker.getQueueTasks('CRM', { perPage: 500 });
    const leads = (Array.isArray(raw) ? raw : []).map(normalizeIssue);

    const today = new Date().toISOString().split('T')[0];
    const byStage = {};
    for (const l of leads) {
      const sk = l.statusKey || 'unknown';
      if (!byStage[sk]) byStage[sk] = { count: 0, budget: 0 };
      byStage[sk].count++;
      const cf = l.customFields || {};
      const budget = Number(cf.budgetKP || cf['Бюджет КП'] || cf.contractSum || cf['Сумма договора'] || 0);
      byStage[sk].budget += budget;
    }

    for (const sk of STAGE_ORDER) {
      const data = byStage[sk] || { count: 0, budget: 0 };
      await query(
        `INSERT INTO crm_snapshots (snapshot_date, stage_key, lead_count, total_budget)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (snapshot_date, stage_key)
         DO UPDATE SET lead_count = $3, total_budget = $4`,
        [today, sk, data.count, Math.round(data.budget)]
      );
    }

    return NextResponse.json({ success: true, date: today, stages: Object.keys(byStage).length });
  } catch (err) {
    console.error('CRM snapshot error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
