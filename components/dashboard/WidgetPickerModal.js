'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Category definitions (picker concern, not in WIDGET_REGISTRY) ──────────
const CATEGORIES = [
  { key: 'all',      label: 'Все' },
  { key: 'core',     label: 'Основные', keys: ['stats_bar', 'tasks_my', 'audit', 'onboarding'] },
  { key: 'crm',      label: 'CRM',      keys: ['kanban_crm', 'funnel_crm', 'crm_analytics', 'crm_timeline', 'lead_aging', 'tasks_crm'] },
  { key: 'projects', label: 'Проекты',  keys: ['tasks_proj', 'portfolio_summary'] },
  { key: 'system',   label: 'Система',  keys: ['system_status', 'quick_links', 'team_onboarding'] },
];

// Color accent per widget (Tailwind craft-* key suffix)
const WIDGET_COLOR = {
  stats_bar: 'accent', tasks_my: 'accent', audit: 'red', onboarding: 'orange',
  kanban_crm: 'cyan', funnel_crm: 'purple', crm_analytics: 'purple',
  crm_timeline: 'cyan', lead_aging: 'orange', tasks_crm: 'cyan',
  tasks_proj: 'green', portfolio_summary: 'green',
  system_status: 'muted', quick_links: 'muted', team_onboarding: 'green',
};

// Color → Tailwind class sets
const COLOR_CLASSES = {
  accent: { ring: 'border-craft-accent/30', bg: 'bg-craft-accent/[0.07]', badge: 'bg-craft-accent/15 text-craft-accent', icon: 'text-craft-accent bg-craft-accent/10' },
  cyan:   { ring: 'border-craft-cyan/30',   bg: 'bg-craft-cyan/[0.06]',   badge: 'bg-craft-cyan/15 text-craft-cyan',     icon: 'text-craft-cyan bg-craft-cyan/10' },
  green:  { ring: 'border-craft-green/30',  bg: 'bg-craft-green/[0.06]',  badge: 'bg-craft-green/15 text-craft-green',   icon: 'text-craft-green bg-craft-green/10' },
  purple: { ring: 'border-craft-purple/30', bg: 'bg-craft-purple/[0.06]', badge: 'bg-craft-purple/15 text-craft-purple', icon: 'text-craft-purple bg-craft-purple/10' },
  orange: { ring: 'border-craft-orange/30', bg: 'bg-craft-orange/[0.06]', badge: 'bg-craft-orange/15 text-craft-orange', icon: 'text-craft-orange bg-craft-orange/10' },
  red:    { ring: 'border-craft-red/30',    bg: 'bg-craft-red/[0.06]',    badge: 'bg-craft-red/15 text-craft-red',       icon: 'text-craft-red bg-craft-red/10' },
  muted:  { ring: 'border-white/[0.12]',    bg: 'bg-white/[0.03]',        badge: 'bg-white/[0.06] text-craft-muted',     icon: 'text-craft-muted bg-white/[0.06]' },
};

// ── Widget SVG icons ─────────────────────────────────────────────────────────
function WidgetIcon({ widgetKey, className = 'w-5 h-5' }) {
  const icons = {
    stats_bar:        <><rect x="2" y="10" width="3" height="6"/><rect x="7" y="6" width="3" height="10"/><rect x="12" y="3" width="3" height="13"/></>,
    tasks_my:         <><rect x="4" y="3" width="8" height="1.5" rx="0.75"/><rect x="4" y="7" width="8" height="1.5" rx="0.75"/><rect x="4" y="11" width="5" height="1.5" rx="0.75"/><circle cx="2" cy="3.75" r="1"/><circle cx="2" cy="7.75" r="1"/><circle cx="2" cy="11.75" r="1"/></>,
    kanban_crm:       <><rect x="1" y="2" width="4" height="12" rx="1"/><rect x="6" y="2" width="4" height="8" rx="1"/><rect x="11" y="2" width="4" height="10" rx="1"/></>,
    tasks_crm:        <><path d="M2 3h12v3H2zM4 6h8v3H4zM6 9h4v3H6z"/></>,
    tasks_proj:       <><path d="M2 4h5v8H2zM9 4h5v8H9zM5 8h6"/></>,
    funnel_crm:       <><path d="M1 2h14l-5 6v5l-4-2V8L1 2z"/></>,
    quick_links:      <><path d="M7 9a3 3 0 0 1 0-4.24L9.17 2.6A3 3 0 0 1 13.4 6.8L11.23 9"/><path d="M9 7a3 3 0 0 1 0 4.24L6.83 13.4A3 3 0 0 1 2.6 9.2L4.77 7"/></>,
    onboarding:       <><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5 8 2z"/></>,
    audit:            <><path d="M8 2L2 5v5a7 7 0 0 0 6 6.9A7 7 0 0 0 14 10V5L8 2z"/><path d="M6 8l1.5 1.5 3-3"/></>,
    portfolio_summary:<><rect x="1" y="3" width="6" height="10" rx="1"/><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="9" y="10" width="6" height="3" rx="1"/></>,
    team_onboarding:  <><circle cx="5" cy="5" r="2"/><circle cx="11" cy="5" r="2"/><path d="M1 13a4 4 0 0 1 8 0M7 13a4 4 0 0 1 8 0"/></>,
    system_status:    <><rect x="2" y="3" width="12" height="9" rx="1"/><path d="M5 15h6M8 12v3"/><circle cx="8" cy="7" r="1.5" fill="currentColor"/></>,
    crm_analytics:    <><path d="M2 13l3-5 3 2 3-6 3 4"/><path d="M2 13h12"/></>,
    crm_timeline:     <><line x1="4" y1="4" x2="4" y2="12"/><circle cx="4" cy="4" r="1.5" fill="currentColor"/><circle cx="4" cy="8" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><line x1="7" y1="4" x2="14" y2="4"/><line x1="7" y1="8" x2="12" y2="8"/><line x1="7" y1="12" x2="13" y2="12"/></>,
    lead_aging:       <><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></>,
  };
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      {icons[widgetKey] || <rect x="2" y="2" width="12" height="12" rx="2"/>}
    </svg>
  );
}

function getCategoryForKey(key) {
  return CATEGORIES.find(c => c.keys?.includes(key));
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WidgetPickerModal({ catalog, active, onApply, onReset, onClose }) {
  const [draft, setDraft]       = useState(() => [...active]);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null); // selected widgetKey for preview

  // Sync draft if active changes externally
  useEffect(() => { setDraft([...active]); }, [active]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggle = useCallback((key) => {
    setDraft(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    setSelected(key);
  }, []);

  const filtered = useMemo(() => {
    let entries = catalog;
    if (category !== 'all') {
      const cat = CATEGORIES.find(c => c.key === category);
      if (cat?.keys) entries = entries.filter(([k]) => cat.keys.includes(k));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(([, w]) =>
        w.title.toLowerCase().includes(q) || w.desc?.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [catalog, category, search]);

  const selectedEntry = selected ? catalog.find(([k]) => k === selected) : null;
  const selectedOn    = selected ? draft.includes(selected) : false;

  const handleApply = () => { onApply(draft); onClose(); };
  const handleReset = () => { onReset(); onClose(); };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-5xl max-h-[88vh] flex flex-col glass-modal border border-craft-border rounded-2xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-craft-border shrink-0">
          <div>
            <div className="text-[15px] font-display font-medium">Каталог виджетов</div>
            <div className="text-2xs text-craft-muted mt-0.5">
              {draft.length} активных из {catalog.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-2xs text-craft-muted hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
            >
              Сбросить
            </button>
            <motion.button
              onClick={handleApply}
              whileTap={{ scale: 0.97 }}
              className="text-2xs px-4 py-1.5 rounded-lg bg-craft-accent/20 text-craft-accent hover:bg-craft-accent/30 transition-colors font-medium"
            >
              Готово
            </motion.button>
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
            >
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3l10 10M13 3L3 13"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* Left: catalog */}
          <div className="flex flex-col flex-1 min-w-0 border-r border-craft-border min-h-0">
            {/* Search + category filters */}
            <div className="px-4 py-3 space-y-2.5 border-b border-craft-border shrink-0">
              <input
                type="search"
                placeholder="Поиск по названию или описанию..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-craft-accent/40"
              />
              <div className="flex gap-1 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    className={`text-2xs px-2.5 py-1 rounded-md transition-colors ${
                      category === cat.key
                        ? 'bg-craft-accent/15 text-craft-accent'
                        : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
                    }`}
                  >
                    {cat.label}
                    {cat.key !== 'all' && (
                      <span className="ml-1 opacity-40">{cat.keys?.length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Widget grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-craft-muted text-sm">Ничего не найдено</div>
                  <button
                    onClick={() => { setSearch(''); setCategory('all'); }}
                    className="text-2xs text-craft-accent/60 hover:text-craft-accent mt-2 transition-colors"
                  >
                    Сбросить фильтр
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filtered.map(([key, w]) => {
                    const on       = draft.includes(key);
                    const isSelected = selected === key;
                    const color    = WIDGET_COLOR[key] || 'muted';
                    const cls      = COLOR_CLASSES[color];

                    return (
                      <button
                        key={key}
                        onClick={() => toggle(key)}
                        className={`text-left rounded-xl border p-3 transition-all duration-200 ${
                          isSelected
                            ? `${cls.ring} ${cls.bg}`
                            : on
                              ? 'border-craft-accent/20 bg-craft-accent/[0.03]'
                              : 'border-white/[0.06] hover:border-white/[0.12] bg-white/[0.01]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Checkbox */}
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all duration-200 ${
                            on ? 'bg-craft-accent/20 border-craft-accent/40' : 'border-white/10'
                          }`}>
                            {on && (
                              <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5l2.5 2.5L8 3" stroke="rgb(var(--craft-accent))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>

                          {/* Icon + text */}
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cls.icon}`}>
                            <WidgetIcon widgetKey={key} className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className={`text-xs font-medium leading-tight ${on ? 'text-white/85' : 'text-white/55'}`}>
                              {w.title}
                            </div>
                            <div className="text-2xs text-white/25 mt-0.5 line-clamp-2">{w.desc}</div>
                          </div>

                          {/* Size badge */}
                          <div className="shrink-0 text-2xs px-1.5 py-0.5 rounded border border-white/[0.08] text-white/20">
                            {w.size === 'full' ? '▬' : '▪'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: preview panel */}
          <div className="hidden md:flex flex-col w-72 lg:w-80 shrink-0 p-5">
            <AnimatePresence mode="wait">
              {selectedEntry ? (
                <motion.div
                  key={selected}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="flex flex-col gap-4"
                >
                  {/* Large icon */}
                  {(() => {
                    const color = WIDGET_COLOR[selected] || 'muted';
                    const cls = COLOR_CLASSES[color];
                    return (
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cls.icon}`}>
                        <WidgetIcon widgetKey={selected} className="w-7 h-7" />
                      </div>
                    );
                  })()}

                  <div>
                    <div className="text-base font-display font-medium mb-1">{selectedEntry[1].title}</div>
                    <div className="text-xs text-white/40 leading-relaxed">{selectedEntry[1].desc}</div>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-2xs px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40">
                      {selectedEntry[1].size === 'full' ? 'Широкий (2 колонки)' : 'Половина (1 колонка)'}
                    </span>
                    {(() => {
                      const cat = getCategoryForKey(selected);
                      if (!cat) return null;
                      return (
                        <span className="text-2xs px-2 py-0.5 rounded-full bg-white/[0.04] text-craft-muted">
                          {cat.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Toggle button */}
                  <motion.button
                    onClick={() => toggle(selected)}
                    whileTap={{ scale: 0.97 }}
                    className={`w-full py-2 rounded-xl text-xs font-medium transition-colors ${
                      selectedOn
                        ? 'bg-white/[0.06] text-white/50 hover:bg-craft-red/10 hover:text-craft-red/70'
                        : 'bg-craft-accent/15 text-craft-accent hover:bg-craft-accent/25'
                    }`}
                  >
                    {selectedOn ? 'Убрать с дашборда' : 'Добавить на дашборд'}
                  </motion.button>

                  {/* Active order hint */}
                  {selectedOn && (
                    <div className="text-2xs text-white/20 text-center">
                      Позиция {draft.indexOf(selected) + 1} из {draft.length}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center text-center gap-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-2">
                    <svg className="w-5 h-5 text-white/15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                      <rect x="2" y="2" width="5" height="5" rx="1"/>
                      <rect x="9" y="2" width="5" height="5" rx="1"/>
                      <rect x="2" y="9" width="5" height="5" rx="1"/>
                      <rect x="9" y="9" width="5" height="5" rx="1"/>
                    </svg>
                  </div>
                  <div className="text-sm text-white/20">Выберите виджет</div>
                  <div className="text-2xs text-white/12">для предпросмотра</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
