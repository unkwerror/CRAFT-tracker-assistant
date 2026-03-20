// ═══ /api/auth/me — текущий пользователь ═══

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { isDbConnected, findUserById, getRoleByKey } from '@/lib/db.mjs';
import { ROLES } from '@/lib/config.mjs';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const fallback = ROLES[session.role] || ROLES.architect;

  if (!isDbConnected()) {
    return NextResponse.json({
      id: session.uid,
      name: session.name,
      role: session.role,
      roleLabel: fallback.label,
      roleColor: fallback.color,
      source: 'session',
    });
  }

  try {
    const user = await findUserById(session.uid);
    if (!user) {
      return NextResponse.json({
        id: session.uid,
        name: session.name,
        role: session.role,
        roleLabel: fallback.label,
        roleColor: fallback.color,
        source: 'session',
      });
    }

    const dbRole = await getRoleByKey(user.role);
    const roleLabel = dbRole?.label ?? fallback.label;
    const roleColor = dbRole?.color ?? fallback.color;
    const queues = Array.isArray(dbRole?.queues) ? dbRole.queues : (fallback.queues || []);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel,
      roleColor,
      queues,
      avatar_url: user.avatar_url,
      office: user.office,
    });
  } catch (err) {
    console.error('DB error in /me:', err.message);
    return NextResponse.json({
      id: session.uid,
      name: session.name,
      role: session.role,
      roleLabel: fallback.label,
      roleColor: fallback.color,
      source: 'session-fallback',
    });
  }
}
