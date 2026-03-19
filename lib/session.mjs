/*
 * Управление сессиями через JWT в httpOnly cookie.
 * Используем jose — лёгкая библиотека для JWT без native-зависимостей.
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'default-dev-secret-change-me-32ch');
const COOKIE_NAME = 'craft_session';

// ─── Создать сессию ───
export async function createSession(userData) {
  const token = await new SignJWT({
    uid: userData.id,
    yandex_uid: userData.yandex_uid,
    name: userData.name,
    role: userData.role,
    tracker_token: userData.tracker_token, // OAuth-токен Трекера
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 дней
    path: '/',
  });

  return token;
}

// ─── Прочитать сессию ───
export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

// ─── Удалить сессию ───
export async function destroySession() {
  cookies().set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
}

// ─── Middleware-хелпер: требовать авторизацию ───
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return { redirect: '/login', session: null };
  }
  return { redirect: null, session };
}
