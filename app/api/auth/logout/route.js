// ═══ /api/auth/logout — выход ═══

import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/session.mjs';

function getBaseUrl(request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
  }
  const origin = request.nextUrl?.origin;
  if (origin) return origin;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

export async function GET(request) {
  await destroySession();
  return NextResponse.redirect(new URL('/login', getBaseUrl(request)));
}
