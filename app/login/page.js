'use client';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const [oauthUrl, setOauthUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Формируем OAuth URL только в браузере — window.location.origin доступен
    const clientId = process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID;
    if (!clientId) {
      setError('NEXT_PUBLIC_YANDEX_CLIENT_ID не настроен');
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/callback`;
    setOauthUrl(
      `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
    );

    // Проверить ошибки из query params
    const params = new URLSearchParams(window.location.search);
    const errCode = params.get('error');
    if (errCode === 'token_failed') setError('Ошибка получения токена. Попробуйте снова.');
    else if (errCode === 'no_code') setError('Яндекс не вернул код авторизации.');
    else if (errCode) setError('Ошибка авторизации. Попробуйте снова.');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0e0e0e' }}>
      <div className="w-full max-w-sm text-center">

        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-craft-accent/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl font-bold font-display text-craft-accent">K</span>
        </div>

        <h1 className="text-xl font-display font-light tracking-tight mb-2">Крафт Ассистент</h1>
        <p className="text-white/30 text-[13px] mb-8">
          Персональный помощник для сотрудников Крафт Групп
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-craft-red/20 bg-craft-red/[0.04] text-left">
            <div className="text-[12px] text-craft-red">{error}</div>
          </div>
        )}

        {/* OAuth button */}
        {oauthUrl ? (
          <a
            href={oauthUrl}
            className="inline-flex items-center justify-center gap-3 w-full px-6 py-3.5 bg-[#FC3F1D] hover:bg-[#e0371a] active:scale-[0.98] text-white font-medium rounded-xl transition-all duration-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.04 12c0-5.523 4.476-10 10-10 5.522 0 10 4.477 10 10s-4.478 10-10 10c-5.524 0-10-4.477-10-10zm10.867 4.801h-1.616V7.199h1.32c2.058 0 3.135 1.012 3.135 2.84 0 1.27-.678 2.227-1.89 2.628L16.139 16.8h-1.82l-2.008-3.828h-.603v3.829h.001zM13 10.088c0-1.091-.465-1.673-1.558-1.673h-.651v3.412h.476c1.156 0 1.733-.572 1.733-1.74z"/>
            </svg>
            Войти через Яндекс
          </a>
        ) : !error ? (
          <div className="w-full px-6 py-3.5 bg-white/[0.03] text-white/20 rounded-xl flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
            <span className="text-[13px]">Подключение...</span>
          </div>
        ) : null}

        {/* Link back to guide */}
        <a href="/" className="inline-block mt-6 text-[12px] text-white/20 hover:text-white/40 transition-colors duration-200">
          Открыть гайд
        </a>

        <p className="text-white/10 text-[11px] mt-4">
          Крафт Групп · v1.1
        </p>
      </div>
    </div>
  );
}
