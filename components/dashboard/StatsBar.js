'use client';
import { useState, useEffect } from 'react';

export default function StatsBar({ trackerConnected = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackerConnected) { setLoading(false); return; }

    Promise.all([
      fetch('/api/tracker/tasks').then(r => r.json()).catch(() => ({ tasks: [] })),
      fetch('/api/tracker/tasks?type=overdue').then(r => r.json()).catch(() => ({ tasks: [] })),
      fetch('/api/tracker/queues/CRM').then(r => r.json()).catch(() => ({ tasks: [], count: 0 })),
    ]).then(([myTasks, overdue, crm]) => {
      const inProgress = (myTasks.tasks || []).filter(t => t.statusKey === 'inProgress').length;
      const total = myTasks.tasks?.length || 0;
      const overdueCount = overdue.tasks?.length || 0;
      const crmCount = crm.count || 0;

      const crmByStatus = {};
      for (const t of (crm.tasks || [])) {
        const sk = t.statusKey || 'unknown';
        crmByStatus[sk] = (crmByStatus[sk] || 0) + 1;
      }

      setStats({ total, inProgress, overdueCount, crmCount, crmByStatus });
    }).finally(() => setLoading(false));
  }, [trackerConnected]);

  if (!trackerConnected) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-craft-surface border border-craft-border rounded-2xl p-4 h-24 flex items-center justify-center">
            <span className="text-[11px] text-white/10">—</span>
          </div>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-craft-surface border border-craft-border rounded-2xl p-4 h-24 animate-pulse-soft" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Мои задачи',
      value: stats?.total || 0,
      sub: `${stats?.inProgress || 0} в работе`,
      color: '#5BA4F5',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="3" y="3" width="14" height="14" rx="3" />
          <path d="M7 10l2 2 4-4" />
        </svg>
      ),
    },
    {
      label: 'Просроченные',
      value: stats?.overdueCount || 0,
      sub: stats?.overdueCount === 0 ? 'Всё в порядке' : 'Требуют внимания',
      color: stats?.overdueCount > 0 ? '#FF7B72' : '#42C774',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l2.5 2.5" />
        </svg>
      ),
    },
    {
      label: 'CRM лиды',
      value: stats?.crmCount || 0,
      sub: `${stats?.crmByStatus?.newLead || 0} новых`,
      color: '#6DD8E0',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M3 4h14l-2 12H5L3 4z" /><path d="M7 4V2h6v2" />
        </svg>
      ),
    },
    {
      label: 'Конверсия',
      value: getConversion(stats?.crmByStatus),
      sub: 'В договор',
      color: '#42C774',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M3 17V8l4-5h6l4 5v9" /><path d="M7 17v-5h6v5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="group bg-craft-surface border border-craft-border rounded-2xl p-4 hover:border-craft-border2 transition-all duration-300 cursor-default"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] text-white/30 font-medium">{card.label}</span>
            <div className="p-1.5 rounded-lg transition-colors duration-200" style={{ color: card.color + '50' }}>
              {card.icon}
            </div>
          </div>
          <div className="text-2xl font-display font-light tracking-tight" style={{ color: card.color }}>
            {card.value}
          </div>
          <div className="text-[11px] text-white/20 mt-0.5">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

function getConversion(byStatus) {
  if (!byStatus) return '—';
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  if (total === 0) return '—';
  const won = (byStatus.contract || 0) + (byStatus.projectOpened || 0);
  return `${Math.round((won / total) * 100)}%`;
}
