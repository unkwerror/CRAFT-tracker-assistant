import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { isDbConnected, getAllUsers, updateUserRole } from '@/lib/db.mjs';
import { ROLES } from '@/lib/config.mjs';
import { ROLE_DASHBOARD } from '@/lib/dashboard-config.mjs';

async function checkAdminAccess() {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated', status: 401 };
  const dashConfig = ROLE_DASHBOARD[session.role];
  if (!dashConfig?.canManageRoles) return { error: 'Forbidden', status: 403 };
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
    return NextResponse.json({ users });
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

  if (!ROLES[role]) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    await updateUserRole(userId, role);
    return NextResponse.json({ success: true, userId, role });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
