import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient, normalizeIssue } from '@/lib/tracker.mjs';
import { scoreAllLeads } from '@/lib/analytics.mjs';

export async function GET(request) {
  const auth = await requirePermission('crm:read');
  if (auth.error) return auth.error;

  const { session } = auth;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const raw = await tracker.getQueueTasks('CRM', { perPage: 500 });
    const leads = (Array.isArray(raw) ? raw : []).map(normalizeIssue);
    const scores = scoreAllLeads(leads);
    const scoreMap = {};
    for (const s of scores) scoreMap[s.key] = s.score;

    if (format === 'json') {
      return jsonOk({ leads, scores });
    }

    const headers = ['Ключ', 'Название', 'Статус', 'Исполнитель', 'Приоритет', 'Создан', 'Обновлён', 'Скоринг'];
    const rows = leads.map(l => [
      l.key,
      `"${(l.summary || '').replace(/"/g, '""')}"`,
      l.status || '',
      l.assignee || '',
      l.priority || '',
      l.createdAt ? new Date(l.createdAt).toLocaleDateString('ru-RU') : '',
      l.updatedAt ? new Date(l.updatedAt).toLocaleDateString('ru-RU') : '',
      scoreMap[l.key] ?? '',
    ]);

    const bom = '\uFEFF';
    const csv = bom + headers.join(';') + '\n' + rows.map(r => r.join(';')).join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="crm-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err) {
    return jsonError(err.message, 502);
  }
}
