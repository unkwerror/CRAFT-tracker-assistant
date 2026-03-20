import { requireAdminWithDb, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { getAllUsers, getAllRoles, updateUserRole, logAction } from '@/lib/db.mjs';

export async function GET() {
  const auth = await requireAdminWithDb();
  if (auth.error) return auth.error;

  try {
    const users = await getAllUsers();
    const roles = await getAllRoles();
    return jsonOk({ users, roles });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function PATCH(request) {
  const auth = await requireAdminWithDb();
  if (auth.error) return auth.error;

  const { userId, role } = await request.json();
  const roles = await getAllRoles();
  if (!roles.find(r => r.key === role)) return jsonError('Invalid role', 400);

  try {
    await updateUserRole(userId, role);
    await logAction(auth.session.uid, 'role_changed', 'user', String(userId), null, { role });
    return jsonOk({ success: true, userId, role });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
