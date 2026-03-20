'use client';
import { useState, useEffect } from 'react';

export default function SystemStatus({ trackerConnected = false, dbConnected = false }) {
  const [apiStatus, setApiStatus] = useState(null);

  useEffect(() => {
    if (!trackerConnected) return;
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setApiStatus(data ? 'ok' : 'error'))
      .catch(() => setApiStatus('error'));
  }, [trackerConnected]);

  const items = [
    {
      label: 'Яндекс Трекер',
      connected: trackerConnected,
      detail: trackerConnected ? 'API подключён' : 'Нужен TRACKER_ORG_ID',
      icon: TrackerIcon,
    },
    {
      label: 'База данных',
      connected: dbConnected,
      detail: dbConnected ? 'PostgreSQL' : 'Нужен DATABASE_URL',
      icon: DbIcon,
    },
    {
      label: 'OAuth Яндекс',
      connected: true,
      detail: 'Авторизация работает',
      icon: OAuthIcon,
    },
    {
      label: 'Tracker API',
      connected: apiStatus === 'ok',
      detail: apiStatus === 'ok' ? 'Токен валиден' : (apiStatus === 'error' ? 'Ошибка токена' : 'Проверка...'),
      icon: ApiIcon,
      loading: apiStatus === null && trackerConnected,
    },
  ];

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-craft-border2">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-craft-border">
        <svg className="w-4 h-4 text-craft-muted/50" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v3l2 1" />
        </svg>
        <h2 className="text-[13px] font-display font-medium tracking-tight">Статус системы</h2>
      </div>
      <div className="p-4 space-y-2.5">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-3 group">
              <Icon className="w-3.5 h-3.5 text-white/15 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-white/60">{item.label}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] ${item.connected ? 'text-craft-green/60' : 'text-white/20'}`}>
                  {item.detail}
                </span>
                {item.loading ? (
                  <div className="w-2 h-2 border border-white/10 border-t-white/30 rounded-full animate-spin" />
                ) : (
                  <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${item.connected ? 'bg-craft-green' : 'bg-white/10'}`} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 border-t border-white/[0.04]">
        <span className="text-[9px] text-white/10 font-mono">v2.1.0 · schema v4</span>
      </div>
    </div>
  );
}

function TrackerIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8 2l4 2v4l-4 6-4-6V4l4-2z" /></svg>;
}
function DbIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><ellipse cx="8" cy="4" rx="5" ry="2" /><path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" /></svg>;
}
function OAuthIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8 1.5L2.5 4v4c0 3.5 2.5 5.5 5.5 6.5 3-1 5.5-3 5.5-6.5V4L8 1.5z" /></svg>;
}
function ApiIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 8h3M11 8h3M8 2v3M8 11v3" /><circle cx="8" cy="8" r="2" /></svg>;
}
