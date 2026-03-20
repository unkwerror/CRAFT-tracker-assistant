'use client';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const [oauthUrl, setOauthUrl] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const clientId = process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID;
    if (!clientId) {
      setError('NEXT_PUBLIC_YANDEX_CLIENT_ID не настроен');
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/callback`;
    setOauthUrl(
      `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
    );

    const params = new URLSearchParams(window.location.search);
    const errCode = params.get('error');
    if (errCode === 'token_failed') setError('Ошибка получения токена. Попробуйте снова.');
    else if (errCode === 'no_code') setError('Яндекс не вернул код авторизации.');
    else if (errCode) setError('Ошибка авторизации. Попробуйте снова.');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-craft-bg">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #5BA4F5, transparent 70%)' }} />
      </div>

      <div
        className="w-full max-w-sm text-center relative z-10 transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        {/* Logo */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-craft-accent/15 to-craft-accent/5 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-craft-accent/5">
          <span className="text-3xl font-bold font-display text-craft-accent">K</span>
        </div>

        <h1 className="text-2xl font-display font-light tracking-tight mb-2">Крафт Ассистент</h1>
        <p className="text-white/25 text-[13px] mb-10 max-w-xs mx-auto leading-relaxed">
          Персональный помощник для сотрудников архитектурного бюро Крафт Групп
        </p>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl border border-craft-red/20 bg-craft-red/[0.04] text-left animate-fadeIn">
            <div className="text-[12px] text-craft-red">{error}</div>
          </div>
        )}

        {/* OAuth button */}
        {oauthUrl ? (
          <a
            href={oauthUrl}
            className="group inline-flex items-center justify-center gap-3 w-full px-6 py-4 bg-[#FC3F1D] hover:bg-[#e0371a] active:scale-[0.98] text-white font-medium rounded-2xl transition-all duration-200 shadow-lg shadow-[#FC3F1D]/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="transition-transform duration-200 group-hover:scale-110">
              <path d="M2.04 12c0-5.523 4.476-10 10-10 5.522 0 10 4.477 10 10s-4.478 10-10 10c-5.524 0-10-4.477-10-10zm10.867 4.801h-1.616V7.199h1.32c2.058 0 3.135 1.012 3.135 2.84 0 1.27-.678 2.227-1.89 2.628L16.139 16.8h-1.82l-2.008-3.828h-.603v3.829h.001zM13 10.088c0-1.091-.465-1.673-1.558-1.673h-.651v3.412h.476c1.156 0 1.733-.572 1.733-1.74z"/>
            </svg>
            Войти через Яндекс
          </a>
        ) : !error ? (
          <div className="w-full px-6 py-4 bg-white/[0.03] text-white/20 rounded-2xl flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
            <span className="text-[13px]">Подключение...</span>
          </div>
        ) : null}

        {/* Features */}
        <div className="mt-10 grid grid-cols-3 gap-3">
          {[
            { icon: '📋', label: 'Задачи' },
            { icon: '📊', label: 'CRM' },
            { icon: '📖', label: 'Гайд' },
          ].map(f => (
            <div key={f.label} className="py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="text-lg mb-1">{f.icon}</div>
              <div className="text-[10px] text-white/20">{f.label}</div>
            </div>
          ))}
        </div>

        {/* Guide link */}
        <a href="/" className="inline-block mt-8 text-[12px] text-white/15 hover:text-white/40 transition-colors duration-200">
          Открыть гайд без авторизации
        </a>

        <p className="text-white/[0.06] text-[10px] mt-4 font-mono">
          Крафт Групп · v2.1.0
        </p>
      </div>
    </div>
  );
}
