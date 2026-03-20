'use client';

export default function SystemStatus({ trackerConnected = false }) {
  const items = [
    {
      label: 'Яндекс Трекер',
      connected: trackerConnected,
      detail: trackerConnected ? 'API подключён' : 'Нужен TRACKER_ORG_ID',
    },
    {
      label: 'Supabase',
      connected: false, // TODO: pass from server
      detail: 'Нужны SUPABASE_URL и ключи',
    },
    {
      label: 'OAuth Яндекс',
      connected: true, // if user is logged in, it works
      detail: 'Авторизация работает',
    },
  ];

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
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
