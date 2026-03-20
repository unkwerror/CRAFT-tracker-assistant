/**
 * Shared helpers for Next.js API routes.
 * Eliminates duplicated auth checks across route handlers.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { ADMIN_ROLES } from '@/lib/config.mjs';
import { isDbConnected } from '@/lib/db.mjs';

export function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk(data, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Require authenticated session. Returns { session } or a NextResponse error.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) return { error: jsonError('Not authenticated', 401) };
  return { session };
}

/**
 * Require admin role (exdir | admin). Returns { session } or a NextResponse error.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: jsonError('Not authenticated', 401) };
  if (!ADMIN_ROLES.includes(session.role)) return { error: jsonError('Forbidden', 403) };
  return { session };
}

/**
 * Require DB connection. Returns a NextResponse error if not available.
 */
export function requireDb() {
  if (!isDbConnected()) return jsonError('DB not configured', 503);
  return null;
}

/**
 * Combines requireAdmin + requireDb in one call.
 */
export async function requireAdminWithDb() {
  const auth = await requireAdmin();
  if (auth.error) return auth;
  const dbErr = requireDb();
  if (dbErr) return { error: dbErr };
  return auth;
}

/**
 * Combines requireAuth + requireDb in one call.
 */
export async function requireAuthWithDb() {
  const auth = await requireAuth();
  if (auth.error) return auth;
  const dbErr = requireDb();
  if (dbErr) return { error: dbErr };
  return auth;
}
