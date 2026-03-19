'use client';

export default function LoginPage() {
  const clientId = process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID || '';
  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/callback`
    : '';

  const oauthUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">

        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-black mx-auto mb-6">
          К
        </div>

        <h1 className="text-2xl font-extrabold mb-2">Крафт Ассистент</h1>
        <p className="text-gray-400 text-sm mb-8">
          Персональный помощник для работы с Яндекс Трекером
        </p>

        {/* OAuth button */}
        <a
          href={oauthUrl}
          className="inline-flex items-center justify-center gap-3 w-full px-6 py-3 bg-[#FC3F1D] hover:bg-[#e0371a] text-white font-semibold rounded-xl transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.32 24V13.5l-3.66 10.5H7.1L3.36 13.5V24H0V0h4.6c4.56 0 6.86 2.34 6.86 6.12 0 2.52-1.2 4.38-3.48 5.34L12.48 24h.84zm-3.66-11.1c2.04-.48 3.12-1.92 3.12-4.2 0-2.58-1.32-3.9-4.08-3.9H3.36v9.18l6.3-1.08z"/>
          </svg>
          Войти через Яндекс
        </a>

        {/* Dev mode notice */}
        <div className="mt-8 p-4 rounded-xl border border-craft-border bg-craft-surface text-left">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">
            Режим разработки
          </p>
          <p className="text-xs text-gray-400">
            Для работы OAuth нужен <code className="text-blue-400">NEXT_PUBLIC_YANDEX_CLIENT_ID</code> в <code className="text-blue-400">.env.local</code>.
            Без него кнопка ведёт на пустой URL.
          </p>
        </div>

        <p className="text-gray-600 text-xs mt-6">
          Крафт Групп · v1.0
        </p>
      </div>
    </div>
  );
}
