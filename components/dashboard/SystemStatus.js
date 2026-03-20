'use client';

export default function SystemStatus({ trackerConnected = false, dbConnected = false }) {
  const items = [
    {
      label: 'Яндекс Трекер',
      connected: trackerConnected,
      detail: trackerConnected ? 'API подключён' : 'Нужен TRACKER_ORG_ID',
    },
    {
      label: 'База данных',
      connected: dbConnected,
      detail: dbConnected ? 'PostgreSQL подключён' : 'Нужен DATABASE_URL',
    },
    {
      label: 'OAuth Яндекс',
      connected: true,
      detail: 'Авторизация работает',
    },
  ];

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-craft-border2">
      <div className="px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">Статус системы</h2>
      </div>
      <div className="p-4 space-y-2.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${item.connected ? 'bg-craft-green' : 'bg-white/10'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white/60">{item.label}</div>
            </div>
            <span className={`text-2xs ${item.connected ? 'text-craft-green/60' : 'text-white/20'}`}>
              {item.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
