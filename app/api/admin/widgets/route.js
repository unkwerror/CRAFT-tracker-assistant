import { requireAdminWithDb, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { getAllWidgets, query, logAction } from '@/lib/db.mjs';

export async function GET() {
  const auth = await requireAdminWithDb();
  if (auth.error) return auth.error;

  try {
    const widgets = await getAllWidgets();
    return jsonOk({ widgets });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function PATCH(request) {
  const auth = await requireAdminWithDb();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { widgetKey } = body;
  if (!widgetKey) return jsonError('widgetKey required');

  try {
    // is_active toggle
    if ('is_active' in body) {
      const { is_active } = body;
      await query('UPDATE widgets SET is_active = $2 WHERE key = $1', [widgetKey, !!is_active]);
      await logAction(auth.session.uid, 'widget_toggled', 'widget', widgetKey, null, { is_active });
      return jsonOk({ success: true });
    }

    // allowed_roles / default_for update
    const { field, roles } = body;
    if (!field || !Array.isArray(roles)) return jsonError('field and roles[] required');
    if (!['allowed_roles', 'default_for'].includes(field)) {
      return jsonError('field must be allowed_roles or default_for');
    }
    await query(`UPDATE widgets SET ${field} = $2 WHERE key = $1`, [widgetKey, JSON.stringify(roles)]);
    await logAction(auth.session.uid, 'widget_access_updated', 'widget', widgetKey, null, { field, roles });
    return jsonOk({ success: true });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
