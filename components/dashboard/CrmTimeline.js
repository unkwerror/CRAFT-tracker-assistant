'use client';
import { useState, useEffect } from 'react';

export default function CrmTimeline({ trackerConnected = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackerConnected) { setLoading(false); return; }

    fetch('/api/tracker/queues/CRM')
      .then(r => r.json())
      .then(d => {
        const tasks = d.tasks || [];
        const sorted = tasks
          .filter(t => t.updatedAt)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 20);
        setEvents(sorted);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [trackerConnected]);

  if (!trackerConnected) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-6 text-center">
        <div className="text-white/20 text-2xs">Подключите Трекер</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-8 flex justify-center">
        <div className="w-5 h-5 border-2 border-white/5 border-t-craft-cyan/40 rounded-full animate-spin" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-craft-surface border border-craft-border rounded-2xl p-6 text-center">
        <div className="text-white/20 text-2xs">Нет событий CRM</div>
      </div>
    );
  }

  return (
    <div className="bg-craft-surface border border-craft-border rounded-2xl overflow-hidden hover:border-craft-border2 transition-colors">
      <div className="px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">CRM — Лента событий</h2>
      </div>

      <div className="px-5 py-3 max-h-[360px] overflow-y-auto space-y-0">
        {events.map((ev, i) => {
          const date = new Date(ev.updatedAt);
          const ago = formatAgo(date);

          return (
            <div key={ev.key} className="flex gap-3 group">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-craft-accent/40 mt-2 group-hover:bg-craft-accent transition-colors" />
                {i < events.length - 1 && <div className="w-px flex-1 bg-white/[0.06]" />}
              </div>
              <div className="pb-3 min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xs font-mono text-white/20">{ev.key}</span>
                  <span className="text-2xs text-white/15">{ago}</span>
                </div>
                <div className="text-[12px] text-white/60 truncate group-hover:text-white/80 transition-colors">{ev.summary}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xs text-white/25">{ev.status}</span>
                  {ev.assignee && <span className="text-2xs text-white/15">• {ev.assignee}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatAgo(date) {
  const diff = Math.round((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
