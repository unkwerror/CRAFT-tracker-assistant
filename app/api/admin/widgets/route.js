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

  const { widgetKey, field, roles } = await request.json();
  if (!widgetKey || !field || !Array.isArray(roles)) {
    return jsonError('widgetKey, field, and roles[] required');
  }
  if (!['allowed_roles', 'default_for'].includes(field)) {
    return jsonError('field must be allowed_roles or default_for');
  }

  try {
    await query(`UPDATE widgets SET ${field} = $2 WHERE key = $1`, [widgetKey, JSON.stringify(roles)]);
    await logAction(auth.session.uid, 'widget_access_updated', 'widget', widgetKey, null, { field, roles });
    return jsonOk({ success: true });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
