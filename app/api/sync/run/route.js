import { requireAdmin, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';
import { syncAllQueues, fullReconcile } from '@/lib/sync.mjs';

const DEFAULT_QUEUES = ['CRM', 'PROJ', 'DOCS', 'HR'];
const ALLOWED_QUEUES = new Set(DEFAULT_QUEUES);

function normalizeQueues(input) {
  if (!Array.isArray(input) || input.length === 0) return DEFAULT_QUEUES;

  const normalized = Array.from(
    new Set(
      input.map((q) => String(q || '').toUpperCase()).filter((q) => ALLOWED_QUEUES.has(q))
    )
  );

  return normalized.length > 0 ? normalized : DEFAULT_QUEUES;
}

async function parseOptionalBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request) {
  const secret = request.headers.get('x-sync-secret');
  const hasValidSecret = Boolean(process.env.SYNC_SECRET) && secret === process.env.SYNC_SECRET;

  if (!hasValidSecret) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
  }

  const syncToken = process.env.TRACKER_SYNC_TOKEN;
  const orgId = process.env.TRACKER_ORG_ID;
  if (!syncToken || !orgId) {
    return jsonError('Sync tracker credentials are not configured', 503);
  }

  const tracker = new TrackerClient(syncToken, orgId);
  if (!tracker.enabled) return jsonError('Tracker sync client is disabled', 503);

  const startedAt = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') || 'delta').toLowerCase();
    const body = await parseOptionalBody(request);
    const queues = normalizeQueues(body?.queues);

    let results;
    if (mode === 'full') {
      results = [];
      for (const queue of queues) {
        try {
          const result = await fullReconcile(tracker, queue);
          results.push(result);
        } catch (err) {
          results.push({
            queue,
            synced: 0,
            delta: false,
            full: true,
            error: err.message,
          });
        }
      }
    } else {
      results = await syncAllQueues(tracker, queues);
    }

    const duration = `${Date.now() - startedAt}ms`;
    return jsonOk({ results, duration });
  } catch (err) {
    console.error('Sync run error:', err.message);
    return jsonError(err.message, 500);
  }
}
