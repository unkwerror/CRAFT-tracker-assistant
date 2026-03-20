/**
 * Shared helpers for Next.js API routes.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { ROLES, ADMIN_ROLES } from '@/lib/config.mjs';
import { isDbConnected, getRoleByKey } from '@/lib/db.mjs';

export function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk(data, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Resolve permissions for a session: DB role first, fallback to static config.
 */
async function resolvePermissions(session) {
  if (isDbConnected()) {
    try {
      const dbRole = await getRoleByKey(session.role);
      if (dbRole?.permissions && Array.isArray(dbRole.permissions)) {
        return dbRole.permissions;
      }
    } catch { /* fallback */ }
  }
  return ROLES[session.role]?.permissions || [];
}

/**
 * Check if session has a specific permission.
 */
export async function hasPermission(session, permission) {
  const perms = await resolvePermissions(session);
  return perms.includes(permission);
}

/**
 * Require authenticated session.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) return { error: jsonError('Not authenticated', 401) };
  return { session };
}

/**
 * Require admin role (legacy compat + permission check).
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: jsonError('Not authenticated', 401) };
  const hasAdmin = await hasPermission(session, 'admin:panel');
  if (!hasAdmin && !ADMIN_ROLES.includes(session.role)) {
    return { error: jsonError('Forbidden', 403) };
  }
  return { session };
}

/**
 * Require a specific permission.
 */
export async function requirePermission(permission) {
  const session = await getSession();
  if (!session) return { error: jsonError('Not authenticated', 401) };
  const has = await hasPermission(session, permission);
  if (!has) return { error: jsonError('Forbidden', 403) };
  return { session };
}

export function requireDb() {
  if (!isDbConnected()) return jsonError('DB not configured', 503);
  return null;
}

export async function requireAdminWithDb() {
  const auth = await requireAdmin();
  if (auth.error) return auth;
  const dbErr = requireDb();
  if (dbErr) return { error: dbErr };
  return auth;
}

export async function requireAuthWithDb() {
  const auth = await requireAuth();
  if (auth.error) return auth;
  const dbErr = requireDb();
  if (dbErr) return { error: dbErr };
  return auth;
}

export async function requirePermissionWithDb(permission) {
  const auth = await requirePermission(permission);
  if (auth.error) return auth;
  const dbErr = requireDb();
  if (dbErr) return { error: dbErr };
  return auth;
}
