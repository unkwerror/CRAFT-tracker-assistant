import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { isDbConnected, getAllRoles, createRole, updateRole, deleteRole, logAction } from '@/lib/db.mjs';

async function checkAdmin() {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated', status: 401 };
  if (!['exdir', 'admin'].includes(session.role)) return { error: 'Forbidden', status: 403 };
  return { session };
}

// GET /api/admin/roles — list all roles
export async function GET() {
  const auth = await checkAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDbConnected()) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  try {
    const roles = await getAllRoles();
    return NextResponse.json({ roles });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/roles — create new role
export async function POST(request) {
  const auth = await checkAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDbConnected()) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { key, label, color, level, queues } = await request.json();

  if (!key || !label) {
    return NextResponse.json({ error: 'key and label are required' }, { status: 400 });
  }

  // Validate key format: lowercase letters, numbers, underscore
  if (!/^[a-z][a-z0-9_]*$/.test(key)) {
    return NextResponse.json({ error: 'Key must be lowercase latin, start with letter' }, { status: 400 });
  }

  try {
    const role = await createRole({ key, label, color, level, queues });
    await logAction(auth.session.uid, 'role_created', 'role', key, null, { label, color, level });
    return NextResponse.json({ role }, { status: 201 });
  } catch (err) {
    if (err.message.includes('duplicate')) {
      return NextResponse.json({ error: 'Role key already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/roles — update existing role
export async function PATCH(request) {
  const auth = await checkAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDbConnected()) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { key, label, color, level, queues } = await request.json();

  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  try {
    const role = await updateRole(key, { label, color, level, queues });
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    await logAction(auth.session.uid, 'role_updated', 'role', key, null, { label, color, level });
    return NextResponse.json({ role });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/roles — delete non-system role
export async function DELETE(request) {
  const auth = await checkAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDbConnected()) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { key } = await request.json();

  try {
    await deleteRole(key);
    await logAction(auth.session.uid, 'role_deleted', 'role', key);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
