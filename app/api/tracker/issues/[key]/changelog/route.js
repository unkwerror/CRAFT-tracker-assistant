import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

function toRawValue(value) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const parts = value.map(toRawValue).filter((v) => v != null && v !== '');
    return parts.length ? parts.join(', ') : null;
  }
  if (typeof value === 'object') {
    if (value.key != null) return String(value.key);
    if (value.id != null) return String(value.id);
    if (value.value != null) return toRawValue(value.value);
    if (value.display != null) return String(value.display);
    if (value.name != null) return String(value.name);
    return JSON.stringify(value);
  }
  return String(value);
}

function toDisplayValue(value) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const parts = value.map(toDisplayValue).filter((v) => v != null && v !== '');
    return parts.length ? parts.join(', ') : null;
  }
  if (typeof value === 'object') {
    if (value.display != null) return String(value.display);
    if (value.name != null) return String(value.name);
    if (value.key != null) return String(value.key);
    if (value.id != null) return String(value.id);
    if (value.value != null) return toDisplayValue(value.value);
    return JSON.stringify(value);
  }
  return String(value);
}

function normalizeChangelogEntries(changelog = []) {
  return changelog.flatMap((entry) => {
    const fields = Array.isArray(entry?.fields) ? entry.fields : [];
    const updatedBy = entry?.updatedBy?.display || entry?.updatedBy?.id || null;

    if (fields.length === 0) {
      return [{
        field: null,
        fieldDisplay: null,
        from: null,
        to: null,
        fromDisplay: null,
        toDisplay: null,
        updatedAt: entry?.updatedAt || null,
        updatedBy,
      }];
    }

    return fields.map((change) => ({
      field: change?.field?.id || change?.field?.key || null,
      fieldDisplay: change?.field?.display || change?.field?.name || null,
      from: toRawValue(change?.from),
      to: toRawValue(change?.to),
      fromDisplay: toDisplayValue(change?.from),
      toDisplay: toDisplayValue(change?.to),
      updatedAt: entry?.updatedAt || null,
      updatedBy,
    }));
  });
}

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const key = params?.key;
  if (!key) return jsonError('Issue key required', 400);

  const { searchParams } = new URL(request.url);
  const field = searchParams.get('field') || undefined;
  const parsedPerPage = Number.parseInt(searchParams.get('perPage') || '50', 10);
  const perPage = Number.isFinite(parsedPerPage) && parsedPerPage > 0 ? parsedPerPage : 50;

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const changelog = await tracker.getChangelog(key, { field, perPage });
    return jsonOk({ changelog: normalizeChangelogEntries(changelog || []) });
  } catch (err) {
    console.error('Changelog route error:', err.message);
    return jsonError(err.message, 502);
  }
}
