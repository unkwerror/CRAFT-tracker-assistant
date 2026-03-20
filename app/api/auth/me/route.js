import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { isDbConnected, findUserById } from '@/lib/db.mjs';
import { ROLES } from '@/lib/config.mjs';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Если БД не подключена — вернуть данные из сессии
  if (!isDbConnected()) {
    const roleConfig = ROLES[session.role] || ROLES.architect;
    return NextResponse.json({
      id: session.uid,
      name: session.name,
      role: session.role,
      roleLabel: roleConfig.label,
      roleColor: roleConfig.color,
      queues: roleConfig.queues,
      source: 'session',
    });
  }

  try {
    const user = await findUserById(session.uid);

    if (!user) {
      const roleConfig = ROLES[session.role] || ROLES.architect;
      return NextResponse.json({
        id: session.uid,
        name: session.name,
        role: session.role,
        roleLabel: roleConfig.label,
        roleColor: roleConfig.color,
        queues: roleConfig.queues,
        source: 'session',
      });
    }

    const roleConfig = ROLES[user.role] || ROLES.architect;

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: roleConfig.label,
      roleColor: roleConfig.color,
      queues: roleConfig.queues,
      avatar_url: user.avatar_url,
      office: user.office,
    });
  } catch (err) {
    console.error('DB error in /me:', err.message);
    const roleConfig = ROLES[session.role] || ROLES.architect;
    return NextResponse.json({
      id: session.uid,
      name: session.name,
      role: session.role,
      roleLabel: roleConfig.label,
      roleColor: roleConfig.color,
      queues: roleConfig.queues,
      source: 'session-fallback',
    });
  }
}
