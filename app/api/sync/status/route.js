import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { getSyncState } from '@/lib/db.mjs';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const queues = await getSyncState();
    return jsonOk({ queues });
  } catch (err) {
    console.error('Sync status error:', err.message);
    const status = String(err.message || '').includes('DATABASE_URL not configured') ? 503 : 500;
    return jsonError(err.message, status);
  }
}
