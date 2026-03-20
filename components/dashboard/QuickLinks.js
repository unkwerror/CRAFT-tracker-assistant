'use client';

const LINKS = [
  { label: 'Мои задачи', href: 'https://tracker.yandex.ru/issues/?filter=assignee(me())&status=open,inProgress', desc: 'Все задачи, назначенные на вас', color: 'rgb(var(--craft-accent))' },
  { label: 'CRM — Лиды', href: 'https://tracker.yandex.ru/CRM', desc: 'Воронка лидов и сделок', color: 'rgb(var(--craft-cyan))' },
  { label: 'Канбан-доска', href: 'https://tracker.yandex.ru/boards', desc: 'Доска вашей очереди', color: 'rgb(var(--craft-green))' },
  { label: 'API: доски', href: '/api/tracker/boards', desc: 'JSON локального endpoint досок', color: 'rgb(var(--craft-muted))' },
  { label: 'Создать задачу', href: 'https://tracker.yandex.ru/createTicket', desc: 'Новая задача в Трекере', color: 'rgb(var(--craft-purple))' },
  { label: 'Дашборды', href: 'https://tracker.yandex.ru/dashboards', desc: 'Аналитика и отчёты', color: 'rgb(var(--craft-orange))' },
];

export default function QuickLinks({ queues = [] }) {
  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-craft-border2">
      <div className="px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">Быстрые ссылки</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-white/[0.04]">
        {LINKS.map((link, i) => (
          <a key={i} href={link.href} target="_blank" rel="noopener noreferrer"
            className="bg-craft-surface px-4 py-3.5 hover:bg-white/[0.02] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 group">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full transition-transform duration-200 group-hover:scale-125" style={{ background: link.color }} />
              <span className="text-[12px] font-medium text-white/50 group-hover:text-white/80 transition-colors duration-200">{link.label}</span>
            </div>
            <div className="text-[11px] text-white/20 pl-3.5">{link.desc}</div>
          </a>
        ))}
      </div>
      {queues.length > 0 && (
        <div className="px-5 py-3 border-t border-white/[0.04]">
          <div className="text-2xs text-white/15 mb-2 uppercase tracking-wider">Ваши очереди</div>
          <div className="flex flex-wrap gap-1.5">
            {queues.map(q => {
              const name = q.split(':')[0];
              return (
                <a key={q} href={`https://tracker.yandex.ru/${name}`} target="_blank" rel="noopener noreferrer"
                  className="text-2xs px-2.5 py-1 rounded-md bg-white/[0.03] text-white/30 border border-white/[0.06] hover:border-white/10 hover:text-white/50 transition-all duration-200 font-mono">
                  {name}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
