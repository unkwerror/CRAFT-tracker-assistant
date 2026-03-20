import { normalizeIssue } from '@/lib/tracker.mjs';
import { upsertManyIssues, updateSyncState, getSyncState } from '@/lib/db.mjs';

const DEFAULT_QUEUES = ['CRM', 'PROJ', 'DOCS', 'HR'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readQueueSyncRow(queueKey) {
  const rows = await getSyncState();
  return rows.find((row) => row.queue_key === queueKey) || null;
}

function buildSyncFilter(queueKey, lastSyncAt) {
  const filter = { queue: queueKey };

  if (!lastSyncAt) {
    return { filter, delta: false };
  }

  const overlap = new Date(lastSyncAt.getTime() - 2 * 60 * 1000);
  filter.updatedAt = { from: overlap.toISOString() };
  return { filter, delta: true };
}

export async function syncQueue(tracker, queueKey, options = {}) {
  if (!tracker?.enabled) throw new Error('Tracker is not configured for sync');

  const safeQueueKey = String(queueKey || '').toUpperCase();
  if (!safeQueueKey) throw new Error('queueKey is required');

  await updateSyncState(safeQueueKey, { status: 'running', errorMessage: null });

  try {
    const state = await readQueueSyncRow(safeQueueKey);
    const lastSyncAt = options.full
      ? null
      : (state?.last_sync_at ? new Date(state.last_sync_at) : null);

    const { filter, delta } = buildSyncFilter(safeQueueKey, lastSyncAt);
    const rawIssues = await tracker.issues.search(filter, 1, 100, { allPages: true });
    const normalized = (rawIssues || []).map((raw) => normalizeIssue(raw));

    await upsertManyIssues(normalized);

    const now = new Date();
    await updateSyncState(safeQueueKey, {
      status: 'idle',
      lastSyncAt: now,
      issuesSynced: normalized.length,
      errorMessage: null,
      ...(options.full ? { lastFullSync: now } : {}),
    });

    console.log(`[sync] queue ${safeQueueKey} synced: ${normalized.length} issues (${delta ? 'delta' : 'full'})`);
    return { queue: safeQueueKey, synced: normalized.length, delta };
  } catch (err) {
    await updateSyncState(safeQueueKey, {
      status: 'error',
      errorMessage: err.message,
    });
    console.error(`[sync] queue ${safeQueueKey} failed:`, err.message);
    throw err;
  }
}

export async function syncAllQueues(tracker, queues = DEFAULT_QUEUES) {
  const safeQueues = Array.isArray(queues) && queues.length > 0
    ? queues.map((q) => String(q).toUpperCase())
    : DEFAULT_QUEUES;

  const results = [];

  for (let i = 0; i < safeQueues.length; i += 1) {
    const queueKey = safeQueues[i];
    try {
      const result = await syncQueue(tracker, queueKey);
      results.push(result);
    } catch (err) {
      results.push({
        queue: queueKey,
        synced: 0,
        delta: false,
        error: err.message,
      });
    }

    if (i < safeQueues.length - 1) {
      await sleep(1000);
    }
  }

  return results;
}

export async function fullReconcile(tracker, queueKey) {
  if (!tracker?.enabled) throw new Error('Tracker is not configured for sync');

  const safeQueueKey = String(queueKey || '').toUpperCase();
  if (!safeQueueKey) throw new Error('queueKey is required');

  const result = await syncQueue(tracker, safeQueueKey, { full: true });
  console.log(`[sync] queue ${safeQueueKey} full reconcile complete: ${result.synced}`);
  return { ...result, full: true };
}
