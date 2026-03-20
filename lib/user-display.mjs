import { ROLES } from '@/lib/config.mjs';
import { isDbConnected, findUserById, getRoleByKey } from '@/lib/db.mjs';

/**
 * Единое разрешение профиля и метаданных роли (БД приоритетнее статического ROLES).
 * @param {{ uid: number|string, name?: string, role?: string }} session
 */
export async function resolveUserDisplay(session) {
  const fb = ROLES[session.role] || ROLES.architect;
  const base = {
    id: session.uid,
    name: session.name,
    role: session.role,
    roleLabel: fb.label,
    roleColor: fb.color,
    queues: fb.queues,
  };

  if (!isDbConnected()) return base;

  try {
    const user = await findUserById(session.uid);
    if (!user) return base;

    const staticRole = ROLES[user.role] || fb;
    const dbRole = await getRoleByKey(user.role);
    const queues = Array.isArray(dbRole?.queues)
      ? dbRole.queues
      : staticRole.queues;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: dbRole?.label ?? staticRole.label,
      roleColor: dbRole?.color ?? staticRole.color,
      queues,
      avatar_url: user.avatar_url,
      office: user.office,
    };
  } catch {
    return base;
  }
}
