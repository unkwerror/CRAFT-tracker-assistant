'use client';

export default function WidgetPicker({ available, active, onChange, onReset, onClose }) {
  const toggle = (id) => {
    if (active.includes(id)) {
      onChange(active.filter(w => w !== id));
    } else {
      onChange([...active, id]);
    }
  };

  const moveUp = (id) => {
    const idx = active.indexOf(id);
    if (idx <= 0) return;
    const next = [...active];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (id) => {
    const idx = active.indexOf(id);
    if (idx < 0 || idx >= active.length - 1) return;
    const next = [...active];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-craft-border">
        <div>
          <div className="text-[13px] font-display font-medium tracking-tight">Настройка виджетов</div>
          <div className="text-2xs text-white/20 mt-0.5">Включите нужные виджеты и настройте порядок</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onReset} className="text-2xs text-white/20 hover:text-white/40 transition-colors px-2 py-1 rounded hover:bg-white/[0.03]">
            Сбросить
          </button>
          <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors p-1 rounded hover:bg-white/[0.03]">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Widget grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {available.map(([id, widget]) => {
          const isActive = active.includes(id);
          const idx = active.indexOf(id);

          return (
            <div
              key={id}
              className={`
                relative rounded-lg border p-3 transition-all duration-200 cursor-pointer group
                ${isActive
                  ? 'border-craft-accent/20 bg-craft-accent/[0.04]'
                  : 'border-white/[0.06] hover:border-white/10 bg-white/[0.01]'
                }
              `}
              onClick={() => toggle(id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Toggle indicator */}
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all duration-200
                      ${isActive ? 'bg-craft-accent/20 border-craft-accent/40' : 'border-white/10'}`}>
                      {isActive && (
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="var(--craft-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={`text-[12px] font-medium transition-colors ${isActive ? 'text-white/80' : 'text-white/40'}`}>
                      {widget.title}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/20 pl-6 leading-relaxed">{widget.desc}</div>
                </div>

                {/* Reorder buttons */}
                {isActive && (
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => moveUp(id)}
                      disabled={idx === 0}
                      className="p-0.5 text-white/15 hover:text-white/40 disabled:opacity-20 transition-colors"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7l3-3 3 3"/></svg>
                    </button>
                    <button
                      onClick={() => moveDown(id)}
                      disabled={idx === active.length - 1}
                      className="p-0.5 text-white/15 hover:text-white/40 disabled:opacity-20 transition-colors"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5l3 3 3-3"/></svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Size badge */}
              <div className="mt-2 pl-6">
                <span className={`text-2xs px-1.5 py-0.5 rounded ${widget.size === 'full' ? 'bg-white/[0.04] text-white/20' : 'bg-white/[0.02] text-white/15'}`}>
                  {widget.size === 'full' ? 'Широкий' : 'Половина'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
