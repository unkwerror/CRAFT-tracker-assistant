'use client';
import { useState, useEffect } from 'react';

export default function PortfolioSummary({ trackerConnected = false }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackerConnected) { setLoading(false); return; }

    fetch('/api/tracker/queues/PROJ')
      .then(r => r.json())
      .then(data => {
        const tasks = data.tasks || [];
        if (data.warning || tasks.length === 0) {
          setProjects([]);
          return;
        }

        const byComponent = {};
        for (const t of tasks) {
          const comp = t.components?.[0] || 'Без проекта';
          if (!byComponent[comp]) byComponent[comp] = { name: comp, tasks: [], total: 0, closed: 0, overdue: 0, inProgress: 0 };
          const g = byComponent[comp];
          g.tasks.push(t);
          g.total++;
          if (t.statusKey === 'closed') g.closed++;
          if (t.statusKey === 'inProgress') g.inProgress++;
          if (t.deadline && new Date(t.deadline) < new Date() && t.statusKey !== 'closed') g.overdue++;
        }

        const result = Object.values(byComponent)
          .map(g => ({
            ...g,
            progress: g.total > 0 ? Math.round((g.closed / g.total) * 100) : 0,
            status: g.overdue > 0 ? 'at_risk' : g.inProgress > 0 ? 'on_track' : g.closed === g.total ? 'done' : 'on_track',
          }))
          .sort((a, b) => b.total - a.total);

        setProjects(result);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  const STATUS_STYLE = {
    on_track: { label: 'В графике', color: 'text-craft-green', dot: 'bg-craft-green' },
    at_risk: { label: 'Риск', color: 'text-craft-orange', dot: 'bg-craft-orange' },
    done: { label: 'Завершён', color: 'text-craft-accent', dot: 'bg-craft-accent' },
  };

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-craft-border2">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">Портфель проектов</h2>
        {projects.length > 0 && (
          <span className="text-2xs text-white/25">{projects.length} проектов</span>
        )}
      </div>

      {loading ? (
        <div className="px-5 py-8 flex justify-center">
          <div className="w-5 h-5 border-2 border-white/5 border-t-white/20 rounded-full animate-spin" />
        </div>
      ) : !trackerConnected ? (
        <div className="px-5 py-8 text-center">
          <div className="text-[13px] text-white/25 mb-1">Трекер не подключён</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="text-[13px] text-white/25 mb-1">Нет задач в PROJ</div>
          <div className="text-2xs text-white/15">Создайте очередь PROJ в Трекере</div>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {projects.map((p) => {
            const st = STATUS_STYLE[p.status] || STATUS_STYLE.on_track;
            return (
              <div key={p.name} className="px-5 py-3 hover:bg-white/[0.02] transition-all duration-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] text-white/70 truncate">{p.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    <span className={`text-2xs ${st.color}`}>{st.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-craft-accent/40 transition-all duration-500" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-2xs text-white/20 w-8 text-right">{p.progress}%</span>
                  <span className="text-2xs text-white/15">{p.closed}/{p.total}</span>
                </div>
                {p.overdue > 0 && (
                  <div className="text-2xs text-craft-red/60 mt-1">{p.overdue} просрочено</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
