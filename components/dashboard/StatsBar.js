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
      const allMyTasks = myTasks.tasks || [];
      const inProgress = allMyTasks.filter(t => t.statusKey === 'inProgress').length;
      const total = allMyTasks.length;
      const overdueCount = (overdue.tasks || []).length;
      const crmTasks = crm.tasks || [];
      const crmCount = crmTasks.length;

      const crmByStatus = {};
      for (const t of crmTasks) {
        const sk = t.statusKey || 'unknown';
        crmByStatus[sk] = (crmByStatus[sk] || 0) + 1;
      }

      const avgCycleDays = calcAvgCycle(crmTasks);
      const wonCount = (crmByStatus.contract || 0) + (crmByStatus.projectOpened || 0);
      const convRate = crmCount > 0 ? Math.round((wonCount / crmCount) * 100) : null;

      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const recentLeads = crmTasks.filter(t => t.createdAt && new Date(t.createdAt) >= weekAgo).length;
      const prevLeads = crmTasks.filter(t => {
        if (!t.createdAt) return false;
        const d = new Date(t.createdAt);
        const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return d >= twoWeeksAgo && d < weekAgo;
      }).length;

      const leadsTrend = prevLeads > 0 ? Math.round(((recentLeads - prevLeads) / prevLeads) * 100) : null;

      setStats({ total, inProgress, overdueCount, crmCount, crmByStatus, convRate, avgCycleDays, leadsTrend, recentLeads });
    }).finally(() => setLoading(false));
  }, [trackerConnected]);

  if (!trackerConnected) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-craft-surface border border-craft-border rounded-2xl p-4 h-24 flex items-center justify-center">
            <span className="text-[11px] text-white/10">—</span>
          </div>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-craft-surface border border-craft-border rounded-2xl p-4 h-24 animate-pulse" />
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
      trend: null,
      icon: <IconTasks />,
    },
    {
      label: 'Просроченные',
      value: stats?.overdueCount || 0,
      sub: stats?.overdueCount === 0 ? 'Всё в порядке' : 'Требуют внимания',
      color: stats?.overdueCount > 0 ? '#FF7B72' : '#42C774',
      trend: null,
      icon: <IconClock />,
    },
    {
      label: 'CRM лиды',
      value: stats?.crmCount || 0,
      sub: `${stats?.recentLeads || 0} за неделю`,
      color: '#6DD8E0',
      trend: stats?.leadsTrend,
      icon: <IconFunnel />,
    },
    {
      label: 'Конверсия',
      value: stats?.convRate != null ? `${stats.convRate}%` : '—',
      sub: 'В договор / проект',
      color: '#42C774',
      trend: null,
      icon: <IconChart />,
    },
    {
      label: 'Цикл сделки',
      value: stats?.avgCycleDays != null ? `${stats.avgCycleDays}д` : '—',
      sub: 'Среднее время',
      color: '#C9A0FF',
      trend: null,
      icon: <IconCalendar />,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
          <div className="flex items-end gap-2">
            <div className="text-2xl font-display font-light tracking-tight" style={{ color: card.color }}>
              {card.value}
            </div>
            {card.trend != null && card.trend !== 0 && (
              <span className={`text-2xs font-medium mb-1 ${card.trend > 0 ? 'text-craft-green' : 'text-craft-red'}`}>
                {card.trend > 0 ? '↑' : '↓'}{Math.abs(card.trend)}%
              </span>
            )}
          </div>
          <div className="text-[11px] text-white/20 mt-0.5">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

function calcAvgCycle(tasks) {
  const closed = tasks.filter(t =>
    (t.statusKey === 'contract' || t.statusKey === 'projectOpened') && t.createdAt
  );
  if (closed.length === 0) return null;

  let totalDays = 0;
  for (const t of closed) {
    const start = new Date(t.createdAt);
    const end = t.updatedAt ? new Date(t.updatedAt) : new Date();
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    totalDays += days;
  }
  return Math.round(totalDays / closed.length);
}

function IconTasks() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="3" y="3" width="14" height="14" rx="3" /><path d="M7 10l2 2 4-4" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2.5" />
    </svg>
  );
}
function IconFunnel() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M3 4h14l-2 12H5L3 4z" /><path d="M7 4V2h6v2" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M3 17V8l4-5h6l4 5v9" /><path d="M7 17v-5h6v5" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 2v4M13 2v4" />
    </svg>
  );
}
