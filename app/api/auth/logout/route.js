import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/session.mjs';

export async function GET(request) {
  await destroySession();
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return NextResponse.redirect(new URL('/login', `${proto}://${host}`));
}
