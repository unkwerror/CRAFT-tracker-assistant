'use client';
import { useState, useEffect } from 'react';

export default function TeamOnboarding() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => {
        if (!r.ok) throw new Error('no-api');
        return r.json();
      })
      .then(data => {
        const users = data.users || [];
        setTeam(users);
        setDbConnected(true);

        if (users.length > 0) {
          fetch('/api/onboarding?all=true')
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(ob => {
              const progressMap = ob.progress || {};
              setTeam(prev => prev.map(u => ({
                ...u,
                onboarding_pct: progressMap[u.id] ?? 0,
              })));
            })
            .catch(() => {});
        }
      })
      .catch(() => setDbConnected(false))
      .finally(() => setLoading(false));
  }, []);

  const totalCompleted = team.filter(m => m.onboarding_pct === 100).length;

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-craft-border2">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">Онбординг команды</h2>
        {team.length > 0 && (
          <span className="text-2xs text-white/25">{totalCompleted}/{team.length} завершили</span>
        )}
      </div>

      {loading ? (
        <div className="px-5 py-8 flex justify-center">
          <div className="w-5 h-5 border-2 border-white/5 border-t-white/20 rounded-full animate-spin" />
        </div>
      ) : !dbConnected ? (
        <div className="px-5 py-8 text-center">
          <div className="text-[13px] text-white/25 mb-1">БД не подключена</div>
          <div className="text-2xs text-white/15">Прогресс команды появится после подключения базы данных</div>
        </div>
      ) : team.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="text-[13px] text-white/25">Нет пользователей</div>
        </div>
      ) : (
        <div className="px-5 py-3 space-y-2.5 max-h-[300px] overflow-y-auto">
          {team.map((m) => {
            const pct = m.onboarding_pct || 0;
            const done = pct === 100;
            return (
              <div key={m.id} className="flex items-center gap-3 group">
                <div className="w-28 min-w-0 shrink-0">
                  <div className="text-[12px] text-white/50 truncate group-hover:text-white/70 transition-colors duration-200">{m.name}</div>
                  <div className="text-2xs text-white/15">{m.role}</div>
                </div>
                <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${pct}%`,
                      background: done ? '#42C774' : '#5BA4F5',
                      opacity: done ? 0.6 : 0.5,
                    }}
                  />
                </div>
                <span className={`text-2xs w-8 text-right font-mono ${done ? 'text-craft-green/60' : 'text-white/20'}`}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
