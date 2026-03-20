import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-secret-change-me-in-production!!'
);
const COOKIE_NAME = 'craft_session';

export async function createSession(userData) {
  const token = await new SignJWT({
    uid: userData.id,
    yandex_uid: userData.yandex_uid,
    name: userData.name,
    role: userData.role,
    tracker_token: userData.tracker_token,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET);

  try {
    const cookieStore = cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
  } catch (err) {
    console.error('Failed to set session cookie:', err.message);
  }

  return token;
}

export async function getSession() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  try {
    const cookieStore = cookies();
    cookieStore.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  } catch (err) {
    console.error('Failed to destroy session:', err.message);
  }
}
