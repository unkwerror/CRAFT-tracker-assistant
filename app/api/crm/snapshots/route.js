import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { getSnapshots } from '@/lib/db.mjs';

function toDateOnly(date) {
  return date.toISOString().split('T')[0];
}

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const defaultTo = toDateOnly(now);
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 30);
    const defaultFrom = toDateOnly(fromDate);

    const from = searchParams.get('from') || defaultFrom;
    const to = searchParams.get('to') || defaultTo;

    const snapshots = await getSnapshots(from, to);
    return jsonOk({ snapshots });
  } catch (err) {
    console.error('CRM snapshots GET error:', err.message);
    const status = String(err.message || '').includes('DATABASE_URL not configured') ? 503 : 500;
    return jsonError(err.message, status);
  }
}
