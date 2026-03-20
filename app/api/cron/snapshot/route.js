import { jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { insertSnapshot, query } from '@/lib/db.mjs';

function toDateOnly(date) {
  return date.toISOString().split('T')[0];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(request) {
  const expectedSecret = process.env.SYNC_SECRET;
  if (!expectedSecret) return jsonError('SYNC_SECRET is not configured', 503);

  const providedSecret = request.headers.get('x-sync-secret');
  if (providedSecret !== expectedSecret) return jsonError('Unauthorized', 401);

  try {
    const today = toDateOnly(new Date());

    const { rows } = await query(
      `SELECT
        COALESCE(status_key, 'unknown') AS stage_key,
        COUNT(*)::int AS lead_count,
        COALESCE(SUM(
          CASE
            WHEN (custom_fields->>'budgetKP') ~ '^-?[0-9]+$'
              THEN (custom_fields->>'budgetKP')::bigint
            WHEN (custom_fields->>'contractSum') ~ '^-?[0-9]+$'
              THEN (custom_fields->>'contractSum')::bigint
            ELSE 0
          END
        ), 0)::bigint AS total_budget,
        AVG(EXTRACT(EPOCH FROM (NOW() - COALESCE(tracker_created_at, created_at))) / 86400.0) AS avg_cycle_days
       FROM issues
       WHERE queue_key = 'CRM'
       GROUP BY COALESCE(status_key, 'unknown')
       ORDER BY stage_key`
    );

    const stages = [];
    for (const row of rows) {
      const stageKey = row.stage_key;
      const count = toNumber(row.lead_count, 0);
      const budget = Math.round(toNumber(row.total_budget, 0));
      const avgCycle = row.avg_cycle_days == null ? null : Math.round(toNumber(row.avg_cycle_days, 0) * 100) / 100;

      await insertSnapshot(today, stageKey, count, budget, avgCycle);
      stages.push({
        stageKey,
        count,
        budget,
        avgCycleDays: avgCycle,
      });
    }

    return jsonOk({ date: today, stages });
  } catch (err) {
    console.error('Snapshot cron error:', err.message);
    const status = String(err.message || '').includes('DATABASE_URL not configured') ? 503 : 500;
    return jsonError(err.message, status);
  }
}
