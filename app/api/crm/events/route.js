import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { getCrmEvents, insertCrmEvent } from '@/lib/db.mjs';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const issueKey = searchParams.get('issueKey') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const eventType = searchParams.get('eventType') || undefined;
    const limit = parsePositiveInt(searchParams.get('limit'), 50);
    const offset = parseNonNegativeInt(searchParams.get('offset'), 0);

    const events = await getCrmEvents({ issueKey, from, to, eventType, limit, offset });
    return jsonOk({ events });
  } catch (err) {
    console.error('CRM events GET error:', err.message);
    const status = String(err.message || '').includes('DATABASE_URL not configured') ? 503 : 500;
    return jsonError(err.message, status);
  }
}

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  try {
    const body = await request.json();
    const { issueKey, eventType, details } = body || {};

    if (!issueKey || !eventType) {
      return jsonError('issueKey and eventType are required', 400);
    }

    const userId = session?.uid ?? session?.userId ?? null;
    const safeDetails = details && typeof details === 'object' && !Array.isArray(details) ? details : {};
    const event = await insertCrmEvent(issueKey, eventType, userId, safeDetails);

    return jsonOk({ event }, 201);
  } catch (err) {
    console.error('CRM events POST error:', err.message);
    const status = String(err.message || '').includes('DATABASE_URL not configured') ? 503 : 500;
    return jsonError(err.message, status);
  }
}
