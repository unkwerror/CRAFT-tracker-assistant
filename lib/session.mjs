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

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return token;
}

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

export async function destroySession() {
  cookies().set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
}
