import { NextResponse } from 'next/server';
import { createSession } from '@/lib/session.mjs';
import { isDbConnected, findUserByYandexUid, createUser, updateUserLogin, createOnboardingSteps } from '@/lib/db.mjs';
import { EMAIL_ROLE_MAP } from '@/lib/config.mjs';

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

    // ═══ 4. Сохранить в БД (если DATABASE_URL задан) ═══
    let userId = yandexUser.id;
    let userRole = 'architect';
    const userName = yandexUser.real_name || yandexUser.display_name || yandexUser.login;
    const userEmail = yandexUser.default_email;
    const avatarUrl = yandexUser.default_avatar_id
      ? `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`
      : null;

    if (isDbConnected()) {
      try {
        const existing = await findUserByYandexUid(yandexUser.id);

        if (existing) {
          await updateUserLogin(yandexUser.id, {
            tracker_login: trackerLogin,
            name: userName,
            avatar_url: avatarUrl,
          });
          userId = existing.id;
          userRole = existing.role;
        } else {
          // Определить роль: из маппинга по email или architect по умолчанию
          const autoRole = EMAIL_ROLE_MAP[userEmail] || 'architect';

          const newUser = await createUser({
            yandex_uid: yandexUser.id,
            tracker_login: trackerLogin,
            name: userName,
            email: userEmail,
            avatar_url: avatarUrl,
            role: autoRole,
          });

          userId = newUser.id;
          userRole = newUser.role;

          // Создать шаги онбординга
          await createOnboardingSteps(newUser.id);
        }
      } catch (dbErr) {
        console.error('DB error (non-critical, using session fallback):', dbErr.message);
      }
    }

    // ═══ 5. Создать сессию ═══
    await createSession({
      id: userId,
      yandex_uid: yandexUser.id,
      name: userName,
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
