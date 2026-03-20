'use client';

export default function WidgetPicker({ available, active, onChange, onReset, onClose }) {
  const toggle = (id) => {
    onChange(active.includes(id) ? active.filter(w => w !== id) : [...active, id]);
  };

  const move = (id, dir) => {
    const idx = active.indexOf(id);
    const to = idx + dir;
    if (to < 0 || to >= active.length) return;
    const next = [...active];
    [next[idx], next[to]] = [next[to], next[idx]];
    onChange(next);
  };

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-craft-border">
        <div>
          <div className="text-[13px] font-display font-medium tracking-tight">Настройка виджетов</div>
          <div className="text-2xs text-white/20 mt-0.5">Включите нужные и перетаскивайте на дашборде</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onReset} className="text-2xs text-white/20 hover:text-white/40 transition-all duration-200 px-2 py-1 rounded hover:bg-white/[0.03] active:scale-95">Сбросить</button>
          <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-all duration-200 p-1 rounded hover:bg-white/[0.03] active:scale-90">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </button>
        </div>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {available.map(([id, w]) => {
          const on = active.includes(id);
          const idx = active.indexOf(id);
          return (
            <div key={id} onClick={() => toggle(id)}
              className={`relative rounded-lg border p-3 transition-all duration-200 cursor-pointer group
                ${on ? 'border-craft-accent/20 bg-craft-accent/[0.04]' : 'border-white/[0.06] hover:border-white/10 bg-white/[0.01]'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all duration-200
                      ${on ? 'bg-craft-accent/20 border-craft-accent/40' : 'border-white/10'}`}>
                      {on && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="var(--craft-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className={`text-[12px] font-medium transition-colors duration-200 ${on ? 'text-white/80' : 'text-white/40'}`}>{w.title}</span>
                  </div>
                  <div className="text-[11px] text-white/20 pl-6">{w.desc}</div>
                </div>
                {on && (
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
                    <button onClick={() => move(id, -1)} disabled={idx === 0} className="p-0.5 text-white/15 hover:text-white/40 disabled:opacity-20 transition-colors"><svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7l3-3 3 3"/></svg></button>
                    <button onClick={() => move(id, 1)} disabled={idx === active.length - 1} className="p-0.5 text-white/15 hover:text-white/40 disabled:opacity-20 transition-colors"><svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5l3 3 3-3"/></svg></button>
                  </div>
                )}
              </div>
              <div className="mt-2 pl-6">
                <span className={`text-2xs px-1.5 py-0.5 rounded ${w.size === 'full' ? 'bg-white/[0.04] text-white/20' : 'bg-white/[0.02] text-white/15'}`}>
                  {w.size === 'full' ? 'Широкий' : 'Половина'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
