import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { supabase, ROLES } from '@/lib/config.mjs';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Если Supabase не настроен — вернуть данные из сессии
  if (!process.env.SUPABASE_URL) {
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

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.uid)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
}
