import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session.mjs';
import { ROLES } from '@/lib/config.mjs';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const role = ROLES[session.role] || ROLES.architect;

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ background: role.color + '20', color: role.color }}
          >
            {session.name?.[0] || '?'}
          </div>
          <div>
            <div className="font-bold">{session.name}</div>
            <div className="text-sm text-gray-400">{role.label}</div>
          </div>
        </div>
        <a
          href="/api/auth/logout"
          className="text-sm text-gray-500 hover:text-white transition-colors"
        >
          Выйти
        </a>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-craft-surface border border-craft-border rounded-xl p-5">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">Роль</div>
          <div className="text-lg font-bold" style={{ color: role.color }}>{role.label}</div>
        </div>
        <div className="bg-craft-surface border border-craft-border rounded-xl p-5">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">Очереди</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {role.queues.map(q => (
              <span key={q} className="text-xs px-2 py-0.5 rounded-full bg-craft-surface2 text-gray-300 border border-craft-border">
                {q}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-craft-surface border border-craft-border rounded-xl p-5">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">Трекер</div>
          <div className="text-sm text-gray-400">
            {process.env.TRACKER_ORG_ID
              ? <span className="text-green-400">Подключён</span>
              : <span className="text-orange-400">Не настроен (нет ORG_ID)</span>
            }
          </div>
        </div>
      </div>

      {/* Placeholder sections */}
      <div className="space-y-4">
        <div className="bg-craft-surface border border-craft-border rounded-xl p-6">
          <h2 className="font-bold text-lg mb-2">📋 Мои задачи</h2>
          <p className="text-gray-400 text-sm">
            Здесь будут отображаться ваши задачи из Трекера.
            Для подключения нужен <code className="text-blue-400">TRACKER_ORG_ID</code>.
          </p>
        </div>

        <div className="bg-craft-surface border border-craft-border rounded-xl p-6">
          <h2 className="font-bold text-lg mb-2">🎓 Онбординг</h2>
          <p className="text-gray-400 text-sm">
            Трек онбординга — 10 шагов. Для сохранения прогресса нужен Supabase.
          </p>
        </div>

        <div className="bg-craft-surface border border-craft-border rounded-xl p-6">
          <h2 className="font-bold text-lg mb-2">📖 Гайд</h2>
          <p className="text-gray-400 text-sm">
            <a href="/guide" className="text-blue-400 hover:underline">Открыть шпаргалку →</a>
          </p>
        </div>
      </div>

      {/* Debug: session */}
      <details className="mt-8">
        <summary className="text-xs text-gray-600 cursor-pointer">Debug: данные сессии</summary>
        <pre className="mt-2 text-xs text-gray-500 bg-craft-surface2 p-4 rounded-lg overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </details>
    </div>
  );
}
