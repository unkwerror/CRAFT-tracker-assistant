/*
 * GET /api/auth/callback
 *
 * Яндекс OAuth перенаправляет сюда после авторизации.
 * 
 * Режимы:
 * - С Supabase: полный флоу (БД + Трекер)
 * - Без Supabase: сохраняет только в JWT (для разработки)
 * - Без TRACKER_ORG_ID: пропускает проверку Трекера
 */

import { NextResponse } from 'next/server';
import { createSession } from '@/lib/session.mjs';

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
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
    }

    const oauthToken = tokenData.access_token;

    // ═══ 2. Получить данные пользователя из Яндекс ═══
    const userInfoRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${oauthToken}` },
    });
    const yandexUser = await userInfoRes.json();

    // ═══ 3. Проверить Трекер (если ORG_ID задан) ═══
    let trackerLogin = null;
    if (process.env.TRACKER_ORG_ID) {
      try {
        const trackerRes = await fetch('https://api.tracker.yandex.net/v3/myself', {
          headers: {
            'Authorization': `OAuth ${oauthToken}`,
            'X-Org-ID': process.env.TRACKER_ORG_ID,
          },
        });
        if (trackerRes.ok) {
          const trackerUser = await trackerRes.json();
          trackerLogin = trackerUser.login || trackerUser.uid;
        }
      } catch (e) {
        console.warn('Tracker check failed (non-critical):', e.message);
      }
    }

    // ═══ 4. Сохранить в БД (если Supabase подключён) ═══
    let userId = yandexUser.id; // fallback: yandex uid
    let userRole = 'architect';  // default role

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      const { supabase } = await import('@/lib/config.mjs');

      if (supabase) {
        const { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('yandex_uid', yandexUser.id)
          .single();

        if (existing) {
          await supabase
            .from('users')
            .update({
              last_login: new Date().toISOString(),
              tracker_login: trackerLogin || existing.tracker_login,
              name: yandexUser.real_name || yandexUser.display_name || existing.name,
              avatar_url: yandexUser.default_avatar_id
                ? `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`
                : existing.avatar_url,
            })
            .eq('yandex_uid', yandexUser.id);

          userId = existing.id;
          userRole = existing.role;
        } else {
          const { data: newUser } = await supabase
            .from('users')
            .insert({
              yandex_uid: yandexUser.id,
              tracker_login: trackerLogin,
              name: yandexUser.real_name || yandexUser.display_name || 'Новый сотрудник',
              email: yandexUser.default_email,
              avatar_url: yandexUser.default_avatar_id
                ? `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`
                : null,
              role: 'architect',
              last_login: new Date().toISOString(),
            })
            .select()
            .single();

          if (newUser) {
            userId = newUser.id;
            userRole = newUser.role;

            // Создать шаги онбординга
            const steps = Array.from({ length: 10 }, (_, i) => ({
              user_id: newUser.id,
              step_id: i + 1,
              completed: false,
            }));
            await supabase.from('onboarding').insert(steps);
          }
        }
      }
    }

    // ═══ 5. Создать сессию ═══
    await createSession({
      id: userId,
      yandex_uid: yandexUser.id,
      name: yandexUser.real_name || yandexUser.display_name || yandexUser.login,
      role: userRole,
      tracker_token: oauthToken,
    });

    // ═══ 6. Редирект ═══
    return NextResponse.redirect(new URL('/dashboard', request.url));

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.redirect(new URL('/login?error=unknown', request.url));
  }
}
