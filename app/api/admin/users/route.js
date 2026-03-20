import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { isDbConnected, getAllUsers, getAllRoles, updateUserRole, logAction } from '@/lib/db.mjs';

async function checkAdminAccess() {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated', status: 401 };
  if (!['exdir', 'admin'].includes(session.role)) return { error: 'Forbidden', status: 403 };
  return { session };
}

// GET /api/admin/users
export async function GET() {
  const auth = await checkAdminAccess();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDbConnected()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const users = await getAllUsers();
    const roles = await getAllRoles();
    return NextResponse.json({ users, roles });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/users
export async function PATCH(request) {
  const auth = await checkAdminAccess();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDbConnected()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { userId, role } = await request.json();

  // Validate role exists in DB
  const roles = await getAllRoles();
  const validRole = roles.find(r => r.key === role);
  if (!validRole) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    await updateUserRole(userId, role);
    await logAction(auth.session.uid, 'role_changed', 'user', String(userId), null, { role });
    return NextResponse.json({ success: true, userId, role });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
