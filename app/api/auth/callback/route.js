/*
 * GET /api/auth/callback
 * 
 * Яндекс OAuth перенаправляет сюда после авторизации.
 * Получаем code → обмениваем на token → получаем данные пользователя →
 * создаём/обновляем в БД → создаём сессию → редирект на /dashboard.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/config.mjs';
import { createSession } from '@/lib/session.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    // ═══ 1. Обменять code на OAuth-токен ═══
    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.YANDEX_CLIENT_ID,
        client_secret: process.env.YANDEX_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
    }

    const oauthToken = tokenData.access_token;

    // ═══ 2. Получить данные пользователя из Яндекс ═══
    const userInfoRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${oauthToken}` },
    });
    const yandexUser = await userInfoRes.json();

    // ═══ 3. Проверить доступ к Трекеру ═══
    const tracker = new TrackerClient(oauthToken, process.env.TRACKER_ORG_ID);
    let trackerUser;
    try {
      trackerUser = await tracker.getMyself();
    } catch (e) {
      return NextResponse.redirect(new URL('/login?error=no_tracker_access', request.url));
    }

    // ═══ 4. Найти или создать пользователя в БД ═══
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('yandex_uid', yandexUser.id)
      .single();

    let user;

    if (existingUser) {
      // Обновляем last_login и tracker_login
      const { data } = await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          tracker_login: trackerUser.login || trackerUser.uid,
          name: yandexUser.real_name || yandexUser.display_name || existingUser.name,
          avatar_url: `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`,
        })
        .eq('yandex_uid', yandexUser.id)
        .select()
        .single();
      user = data;
    } else {
      // Новый пользователь — роль по умолчанию architect
      const { data } = await supabase
        .from('users')
        .insert({
          yandex_uid: yandexUser.id,
          tracker_login: trackerUser.login || trackerUser.uid,
          name: yandexUser.real_name || yandexUser.display_name || 'Новый сотрудник',
          email: yandexUser.default_email,
          avatar_url: `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`,
          role: 'architect', // Администратор потом поменяет
          last_login: new Date().toISOString(),
        })
        .select()
        .single();
      user = data;

      // Создать шаги онбординга для нового пользователя
      const steps = Array.from({ length: 10 }, (_, i) => ({
        user_id: user.id,
        step_id: i + 1,
        completed: false,
      }));
      await supabase.from('onboarding').insert(steps);
    }

    // ═══ 5. Создать сессию ═══
    await createSession({
      id: user.id,
      yandex_uid: user.yandex_uid,
      name: user.name,
      role: user.role,
      tracker_token: oauthToken,
    });

    // ═══ 6. Редирект на дашборд ═══
    return NextResponse.redirect(new URL('/dashboard', request.url));

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.redirect(new URL('/login?error=unknown', request.url));
  }
}
