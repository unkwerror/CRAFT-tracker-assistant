import { requireAdminWithDb, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { getAllRoles, createRole, updateRole, deleteRole, logAction } from '@/lib/db.mjs';

export async function GET() {
  const auth = await requireAdminWithDb();
  if (auth.error) return auth.error;

  try {
    const roles = await getAllRoles();
    return jsonOk({ roles });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function POST(request) {
  const auth = await requireAdminWithDb();
  if (auth.error) return auth.error;

  const { key, label, color, level, queues } = await request.json();
  if (!key || !label) return jsonError('key and label are required');
  if (!/^[a-z][a-z0-9_]*$/.test(key)) return jsonError('Key must be lowercase latin, start with letter');

  try {
    const role = await createRole({ key, label, color, level, queues });
    await logAction(auth.session.uid, 'role_created', 'role', key, null, { label, color, level });
    return jsonOk({ role }, 201);
  } catch (err) {
    if (err.message.includes('duplicate')) return jsonError('Role key already exists', 409);
    return jsonError(err.message, 500);
  }
}

export async function PATCH(request) {
  const auth = await requireAdminWithDb();
  if (auth.error) return auth.error;

  const { key, label, color, level, queues, permissions } = await request.json();
  if (!key) return jsonError('key is required');

  try {
    const role = await updateRole(key, { label, color, level, queues, permissions });
    if (!role) return jsonError('Role not found', 404);
    await logAction(auth.session.uid, 'role_updated', 'role', key, null, { label, color, level });
    return jsonOk({ role });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function DELETE(request) {
  const auth = await requireAdminWithDb();
  if (auth.error) return auth.error;

  const { key } = await request.json();
  try {
    await deleteRole(key);
    await logAction(auth.session.uid, 'role_deleted', 'role', key);
    return jsonOk({ success: true });
  } catch (err) {
    return jsonError(err.message, 400);
  }
}
