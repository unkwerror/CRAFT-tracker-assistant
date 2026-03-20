'use client';
import { useState, useEffect } from 'react';

const STATUS_MAP = {
  on_track: { label: 'В графике', color: 'text-craft-green', dot: 'bg-craft-green' },
  at_risk: { label: 'Риск', color: 'text-craft-orange', dot: 'bg-craft-orange' },
  blocked: { label: 'Блокирован', color: 'text-craft-red', dot: 'bg-craft-red' },
};

export default function PortfolioSummary({ trackerConnected = false }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackerConnected) {
      setLoading(false);
      return;
    }
    // TODO: fetch portfolio data from Tracker API
    // For now, will need a dedicated endpoint
    fetch('/api/tracker/tasks?type=portfolio')
      .then(r => r.json())
      .then(data => setProjects(data.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
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
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.03] flex items-center justify-center">
            <svg className="w-5 h-5 text-white/10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="3" width="14" height="14" rx="2" />
              <path d="M3 8h14M8 3v14" />
            </svg>
          </div>
          <div className="text-[13px] text-white/25 mb-1">Трекер не подключён</div>
          <div className="text-2xs text-white/15">Обзор портфеля появится после подключения</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="text-[13px] text-white/25">Нет данных о проектах</div>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {projects.map((p, i) => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.on_track;
            return (
              <div key={i} className="px-5 py-3 hover:bg-white/[0.02] transition-all duration-200">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px] text-white/70 truncate">{p.name}</span>
                    {p.phase && <span className="text-2xs text-white/15 shrink-0">{p.phase}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    <span className={`text-2xs ${st.color}`}>{st.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-craft-accent/40 transition-all duration-500" style={{ width: `${p.progress || 0}%` }} />
                  </div>
                  <span className="text-2xs text-white/20 w-8 text-right">{p.progress || 0}%</span>
                  {p.gip && <span className="text-2xs text-white/15">{p.gip}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
