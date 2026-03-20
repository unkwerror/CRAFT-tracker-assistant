import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { supabase, ROLES } from '@/lib/config.mjs';
import { ROLE_DASHBOARD } from '@/lib/dashboard-config.mjs';

// Middleware: check admin access
async function checkAdminAccess() {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated', status: 401 };

  const dashConfig = ROLE_DASHBOARD[session.role];
  if (!dashConfig?.canManageRoles) return { error: 'Forbidden', status: 403 };

  return { session };
}

// GET /api/admin/users — list all users
export async function GET() {
  const auth = await checkAdminAccess();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, role, last_login, avatar_url, office')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users });
}

// PATCH /api/admin/users — update user role
export async function PATCH(request) {
  const auth = await checkAdminAccess();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { userId, role } = await request.json();

  // Validate role
  if (!ROLES[role]) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId, role });
}
