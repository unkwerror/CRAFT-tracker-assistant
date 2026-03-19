'use client';
import { useState } from 'react';

// ══════════════════════════════════════
// TYPOGRAPHY
// ══════════════════════════════════════

export function SectionHero({ num, label, title, subtitle, priority }) {
  const prColors = { MUST: 'bg-red-500/10 text-red-400 border-red-500/20', HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/20', MED: 'bg-sky-500/10 text-sky-400 border-sky-500/20' };
  return (
    <div className="pt-12 pb-8 mb-8 border-b border-white/[0.06]">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 border border-white/10 rounded px-2.5 py-1">Раздел {num}</span>
        {priority && <span className={`text-[10px] font-semibold tracking-[0.06em] uppercase rounded px-2.5 py-1 border ${prColors[priority]}`}>{priority}</span>}
      </div>
      <h1 className="text-[26px] font-light tracking-tight leading-[1.2] mb-3 max-w-[560px]" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h1>
      <p className="text-sm text-white/40 max-w-[500px] leading-relaxed">{subtitle}</p>
    </div>
  );
}

export function H2({ children }) {
  return <h2 className="text-lg font-normal tracking-tight mt-10 mb-2" style={{ fontFamily: 'var(--font-display)' }}>{children}</h2>;
}

export function H3({ children }) {
  return <h3 className="text-sm font-semibold mt-6 mb-2 text-white/80">{children}</h3>;
}

export function P({ children }) {
  return <p className="text-[13px] text-white/50 leading-[1.7] mb-3">{children}</p>;
}

export function B({ children, className = '' }) {
  return <strong className={`text-white/80 font-medium ${className}`}>{children}</strong>;
}

export function Separator() {
  return <div className="h-px bg-white/[0.06] my-8" />;
}

// ══════════════════════════════════════
// CARDS
// ══════════════════════════════════════

const cardAccentMap = {
  red: 'border-red-500/15 bg-red-500/[0.04]',
  amber: 'border-amber-500/15 bg-amber-500/[0.04]',
  teal: 'border-teal-500/15 bg-teal-500/[0.04]',
  blue: 'border-sky-500/15 bg-sky-500/[0.04]',
  purple: 'border-purple-400/15 bg-purple-400/[0.04]',
  default: 'border-white/[0.06] bg-white/[0.02]',
  accent: 'border-sky-400/15 bg-sky-400/[0.03]',
};

export function Card({ title, children, accent = 'default', titleColor }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors hover:border-white/10 ${cardAccentMap[accent] || cardAccentMap.default}`}>
      {title && <div className="text-[13px] font-semibold mb-1.5" style={titleColor ? { color: titleColor } : {}}>{title}</div>}
      <div className="text-[13px] text-white/45 leading-[1.65]">{children}</div>
    </div>
  );
}

export function CardGrid({ cols = 2, children }) {
  const gridCls = { 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' };
  return <div className={`grid ${gridCls[cols] || gridCls[2]} gap-3 my-4`}>{children}</div>;
}

// ══════════════════════════════════════
// TABLE
// ══════════════════════════════════════

export function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto border border-white/[0.06] rounded-xl my-4">
      <table className="w-full text-[13px]">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2.5 bg-white/[0.03] border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-[0.08em] text-white/30">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-white/[0.02] transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-3 py-2.5 border-b border-white/[0.04] text-white/45 ${ci === 0 ? 'font-medium text-white/70' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════
// FLOW / PIPELINE
// ══════════════════════════════════════

export function Flow({ steps, note }) {
  return (
    <div className="my-4">
      <div className="flex flex-wrap items-center gap-0">
        {steps.map((s, i) => (
          <span key={i} className="contents">
            {i > 0 && <span className="text-white/15 text-sm px-1.5 select-none">→</span>}
            <span className={`text-xs font-medium px-3 py-1.5 rounded-md border whitespace-nowrap transition-colors
              ${s.type === 'trigger' ? 'border-red-500/25 bg-red-500/[0.08] text-red-400' :
                s.type === 'active' ? 'border-teal-500/25 bg-teal-500/[0.08] text-teal-400' :
                s.type === 'highlight' ? 'border-sky-400/25 bg-sky-400/[0.06] text-sky-300' :
                'border-white/[0.08] bg-white/[0.02] text-white/50'}`}>
              {s.label}
            </span>
          </span>
        ))}
      </div>
      {note && <div className="text-xs text-white/30 mt-2 leading-relaxed">{note}</div>}
    </div>
  );
}

// ══════════════════════════════════════
// CALLOUT / NOTE
// ══════════════════════════════════════

const calloutStyles = {
  info: 'border-l-sky-400/40 bg-sky-400/[0.03]',
  warn: 'border-l-amber-400/40 bg-amber-400/[0.03]',
  danger: 'border-l-red-400/40 bg-red-400/[0.03]',
  ok: 'border-l-teal-400/40 bg-teal-400/[0.03]',
};

export function Callout({ type = 'info', title, children }) {
  return (
    <div className={`rounded-r-lg border-l-2 px-4 py-3 my-4 text-[13px] ${calloutStyles[type]}`}>
      {title && <div className="font-semibold text-white/70 mb-1">{title}</div>}
      <div className="text-white/45 leading-[1.65]">{children}</div>
    </div>
  );
}

// ══════════════════════════════════════
// ACCORDION
// ══════════════════════════════════════

export function Accordion({ items }) {
  const [openId, setOpenId] = useState(null);
  return (
    <div className="space-y-1.5 my-4">
      {items.map((item, i) => {
        const isOpen = openId === i;
        return (
          <div key={i} className={`border rounded-lg overflow-hidden transition-colors ${isOpen ? 'border-sky-400/20 bg-white/[0.02]' : 'border-white/[0.06]'}`}>
            <button
              onClick={() => setOpenId(isOpen ? null : i)}
              className="w-full text-left px-4 py-3 text-[13px] font-medium flex items-center gap-2 hover:bg-white/[0.02] transition-colors"
            >
              <span className={`text-white/20 text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
              {item.badge && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.badgeClass || 'bg-sky-500/10 text-sky-400'}`}>{item.badge}</span>}
              <span className="text-white/60">{item.title}</span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-4 pb-4 text-[13px] text-white/45 leading-[1.65]">{item.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════
// TASK TREE (for hierarchy visualization)
// ══════════════════════════════════════

const statusColors = {
  'В работе': 'bg-sky-400/10 text-sky-400 border-sky-400/20',
  'Проверка ГИПом': 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  'Заблокировано': 'bg-red-400/10 text-red-400 border-red-400/20',
  'Согласование': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Открыта': 'bg-white/5 text-white/40 border-white/10',
  'Сдана': 'bg-teal-400/10 text-teal-400 border-teal-400/20',
  'Веха': 'bg-purple-400/10 text-purple-300 border-purple-400/20',
};

export function TaskTree({ items }) {
  return (
    <div className="space-y-1 my-4">
      {items.map((item, i) => (
        <div
          key={i}
          className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border bg-white/[0.015] transition-colors hover:bg-white/[0.03]
            ${item.indent ? 'ml-6 border-l-2' : ''}
            ${item.borderColor || 'border-white/[0.06]'}`}
          style={item.indent && item.accentBorder ? { borderLeftColor: item.accentBorder } : {}}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-white/70 truncate">{item.title}</div>
            {item.meta && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                {item.meta.map((m, mi) => (
                  <span key={mi} className="text-[11px] text-white/25">{m}</span>
                ))}
              </div>
            )}
          </div>
          {item.status && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap flex-shrink-0 ${statusColors[item.status] || statusColors['Открыта']}`}>
              {item.status}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════
// CHECKLIST (interactive)
// ══════════════════════════════════════

const clTagColors = {
  MUST: 'bg-red-500/10 text-red-400',
  HIGH: 'bg-amber-500/10 text-amber-400',
  MED: 'bg-sky-500/10 text-sky-400',
};

export function Checklist({ items }) {
  const [checked, setChecked] = useState(new Set());
  const toggle = (i) => {
    const s = new Set(checked);
    s.has(i) ? s.delete(i) : s.add(i);
    setChecked(s);
  };
  return (
    <div className="space-y-1 my-3">
      {items.map((item, i) => (
        <div
          key={i}
          onClick={() => toggle(i)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all text-[13px] ${checked.has(i) ? 'text-white/20 line-through' : 'text-white/50 hover:bg-white/[0.02]'}`}
        >
          <span className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center text-[10px] flex-shrink-0 transition-all ${checked.has(i) ? 'bg-teal-500 border-teal-500 text-white' : 'border-white/15'}`}>
            {checked.has(i) && '✓'}
          </span>
          <span className="flex-1">{item.text}</span>
          {item.tag && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${clTagColors[item.tag] || ''}`}>{item.tag}</span>}
        </div>
      ))}
      <div className="text-[11px] text-white/15 mt-1 pl-3">{checked.size} из {items.length}</div>
    </div>
  );
}

// ══════════════════════════════════════
// TAG ROW
// ══════════════════════════════════════

const tagColors = {
  blue: 'border-sky-400/20 text-sky-400',
  teal: 'border-teal-400/20 text-teal-400',
  red: 'border-red-400/20 text-red-400',
  amber: 'border-amber-400/20 text-amber-400',
  purple: 'border-purple-400/20 text-purple-400',
  default: 'border-white/10 text-white/40',
};

export function TagRow({ tags }) {
  return (
    <div className="flex flex-wrap gap-1.5 my-2">
      {tags.map((t, i) => (
        <span key={i} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border bg-white/[0.02] ${tagColors[t.color] || tagColors.default}`}>
          {t.label}
        </span>
      ))}
    </div>
  );
}

// ══════════════════════════════════════
// SVG INFOGRAPHIC — Queue Architecture
// ══════════════════════════════════════

export function QueueDiagram() {
  return (
    <div className="my-6 overflow-x-auto">
      <svg viewBox="0 0 720 220" className="w-full max-w-[720px]" style={{ minWidth: 500 }}>
        {/* Background */}
        <rect width="720" height="220" rx="12" fill="#0a0f16" stroke="#1e2a3a" strokeWidth="1"/>

        {/* CRM */}
        <rect x="20" y="30" width="150" height="70" rx="8" fill="#0c1520" stroke="#1a3a5c" strokeWidth="1.5"/>
        <text x="95" y="55" textAnchor="middle" fill="#5b9bd5" fontSize="11" fontWeight="600">CRM</text>
        <text x="95" y="72" textAnchor="middle" fill="#4a5a6a" fontSize="9">Продажи и клиенты</text>
        <text x="95" y="88" textAnchor="middle" fill="#3a4a5a" fontSize="8">Дмитриев А.</text>

        {/* Arrow CRM → PROJ */}
        <line x1="170" y1="65" x2="200" y2="65" stroke="#c0392b" strokeWidth="1.5" strokeDasharray="4,3"/>
        <polygon points="200,61 208,65 200,69" fill="#c0392b"/>
        <text x="189" y="58" textAnchor="middle" fill="#c0392b" fontSize="7" fontWeight="600">T1</text>

        {/* PROJ */}
        <rect x="210" y="20" width="200" height="90" rx="8" fill="#0c1520" stroke="#1a5c3a" strokeWidth="1.5"/>
        <text x="310" y="42" textAnchor="middle" fill="#4a9e6a" fontSize="11" fontWeight="600">PROJ</text>
        <text x="310" y="57" textAnchor="middle" fill="#4a5a6a" fontSize="9">Производство</text>
        <text x="245" y="78" textAnchor="start" fill="#3a4a5a" fontSize="7">АР  КР  ОВ  ВК  ЭО</text>
        <text x="245" y="90" textAnchor="start" fill="#3a4a5a" fontSize="7">ГП  ПЗ  ПБ  ОИ  ИКЭ</text>
        <text x="310" y="103" textAnchor="middle" fill="#3a4a5a" fontSize="7">ГИП: Иванова / Солдатов</text>

        {/* Arrow PROJ → DOCS */}
        <line x1="410" y1="65" x2="440" y2="65" stroke="#4a5a6a" strokeWidth="1" strokeDasharray="3,3"/>
        <polygon points="440,62 446,65 440,68" fill="#4a5a6a"/>

        {/* DOCS */}
        <rect x="450" y="30" width="130" height="70" rx="8" fill="#0c1520" stroke="#4a3a6a" strokeWidth="1.5"/>
        <text x="515" y="55" textAnchor="middle" fill="#7c6db5" fontSize="11" fontWeight="600">DOCS</text>
        <text x="515" y="72" textAnchor="middle" fill="#4a5a6a" fontSize="9">Документооборот</text>
        <text x="515" y="88" textAnchor="middle" fill="#3a4a5a" fontSize="8">Администратор</text>

        {/* HR */}
        <rect x="600" y="30" width="100" height="70" rx="8" fill="#0c1520" stroke="#5a4a2a" strokeWidth="1.5"/>
        <text x="650" y="55" textAnchor="middle" fill="#c49a3a" fontSize="11" fontWeight="600">HR</text>
        <text x="650" y="72" textAnchor="middle" fill="#4a5a6a" fontSize="9">Внутренние</text>
        <text x="650" y="88" textAnchor="middle" fill="#3a4a5a" fontSize="8">Тюмень / Екб</text>

        {/* Project container */}
        <rect x="55" y="130" width="620" height="60" rx="8" fill="none" stroke="#5b9bd5" strokeWidth="1" strokeDasharray="6,4" opacity="0.3"/>
        <text x="365" y="153" textAnchor="middle" fill="#5b9bd5" fontSize="10" fontWeight="500" opacity="0.5">Проект «Школа на Садовой»</text>
        <text x="365" y="172" textAnchor="middle" fill="#4a5a6a" fontSize="8">объединяет задачи из PROJ + DOCS + HR под одним объектом</text>

        {/* Connection lines to project */}
        <line x1="310" y1="110" x2="310" y2="130" stroke="#5b9bd5" strokeWidth="0.5" opacity="0.3"/>
        <line x1="515" y1="100" x2="515" y2="130" stroke="#5b9bd5" strokeWidth="0.5" opacity="0.3"/>
        <line x1="650" y1="100" x2="650" y2="130" stroke="#5b9bd5" strokeWidth="0.5" opacity="0.3"/>

        {/* Labels */}
        <text x="189" y="78" textAnchor="middle" fill="#5a3a2a" fontSize="6">Триггер</text>
        <text x="443" y="58" textAnchor="middle" fill="#3a4a5a" fontSize="6">связь</text>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════
// SVG INFOGRAPHIC — Kanban Board
// ══════════════════════════════════════

export function KanbanDiagram() {
  const cols = [
    { title: 'Открыта', color: '#4a5a6a', tasks: ['ЭО — Школа', 'ПЗ — Школа'] },
    { title: 'В работе', color: '#5b9bd5', tasks: ['АР — Школа', 'КР — Школа', 'ДС — Парк'] },
    { title: 'Треб. информацию', color: '#c49a3a', tasks: ['ГП — Школа'] },
    { title: 'Проверка ГИПом', color: '#7c6db5', tasks: ['НО — Парк'] },
    { title: 'Согласование', color: '#5b9bd5', tasks: ['БО — Парк'] },
    { title: 'Сдана', color: '#4a9e6a', tasks: ['АР — Парк'] },
  ];

  return (
    <div className="my-6 overflow-x-auto">
      <svg viewBox="0 0 780 200" className="w-full" style={{ minWidth: 600 }}>
        <rect width="780" height="200" rx="12" fill="#0a0f16" stroke="#1e2a3a" strokeWidth="1"/>
        {cols.map((col, ci) => {
          const x = 12 + ci * 128;
          return (
            <g key={ci}>
              <rect x={x} y="10" width="120" height="180" rx="6" fill="#0e1520" stroke="#1a2535" strokeWidth="0.5"/>
              <text x={x + 60} y="28" textAnchor="middle" fill={col.color} fontSize="8" fontWeight="600" letterSpacing="0.05em">{col.title.toUpperCase()}</text>
              <line x1={x + 10} y1="35" x2={x + 110} y2="35" stroke="#1a2535" strokeWidth="0.5"/>
              {col.tasks.map((task, ti) => (
                <g key={ti}>
                  <rect x={x + 8} y={42 + ti * 34} width="104" height="28" rx="4" fill="#111a25" stroke="#1e2a3a" strokeWidth="0.5"/>
                  <text x={x + 60} y={59 + ti * 34} textAnchor="middle" fill="#8a9aaa" fontSize="8">{task}</text>
                </g>
              ))}
              <text x={x + 60} y="192" textAnchor="middle" fill="#2a3a4a" fontSize="8">{col.tasks.length}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ══════════════════════════════════════
// SVG — Hierarchy Diagram
// ══════════════════════════════════════

export function HierarchyDiagram() {
  return (
    <div className="my-6 overflow-x-auto">
      <svg viewBox="0 0 700 340" className="w-full" style={{ minWidth: 500 }}>
        <rect width="700" height="340" rx="12" fill="#0a0f16" stroke="#1e2a3a" strokeWidth="1"/>

        {/* Portfolio */}
        <rect x="240" y="15" width="220" height="32" rx="6" fill="#0e1a28" stroke="#1a4a7a" strokeWidth="1.5"/>
        <text x="350" y="35" textAnchor="middle" fill="#5b9bd5" fontSize="10" fontWeight="600">Портфель «Крафт Групп 2026»</text>

        {/* Line down */}
        <line x1="350" y1="47" x2="350" y2="65" stroke="#1a4a7a" strokeWidth="1"/>

        {/* Project */}
        <rect x="220" y="65" width="260" height="32" rx="6" fill="#0e1a28" stroke="#1a5c3a" strokeWidth="1.5"/>
        <text x="350" y="85" textAnchor="middle" fill="#4a9e6a" fontSize="10" fontWeight="600">Проект «Школа на Садовой»</text>

        {/* Lines to children */}
        <line x1="350" y1="97" x2="350" y2="110" stroke="#1a2a3a" strokeWidth="1"/>
        <line x1="150" y1="110" x2="590" y2="110" stroke="#1a2a3a" strokeWidth="0.5"/>

        {/* Epic */}
        <line x1="200" y1="110" x2="200" y2="125" stroke="#1a2a3a" strokeWidth="0.5"/>
        <rect x="80" y="125" width="240" height="28" rx="5" fill="#1a1510" stroke="#5a4a2a" strokeWidth="1"/>
        <text x="200" y="143" textAnchor="middle" fill="#c49a3a" fontSize="9" fontWeight="600">PROJ-45 [Epic] — Школа стадия П</text>

        {/* Subtasks */}
        <line x1="200" y1="153" x2="200" y2="165" stroke="#1a2a3a" strokeWidth="0.5"/>
        {[
          { x: 50, label: 'АР', status: 'Проверка', sc: '#7c6db5' },
          { x: 150, label: 'КР', status: 'В работе', sc: '#5b9bd5' },
          { x: 250, label: 'ОВ', status: 'Блок.', sc: '#c0392b' },
          { x: 340, label: 'ВК', status: 'Блок.', sc: '#c0392b' },
        ].map((t, i) => (
          <g key={i}>
            <line x1={t.x + 40} y1="165" x2={t.x + 40} y2="175" stroke="#1a2a3a" strokeWidth="0.5"/>
            <rect x={t.x} y="175" width="80" height="36" rx="4" fill="#0e1520" stroke="#1e2a3a" strokeWidth="0.5"/>
            <text x={t.x + 40} y="190" textAnchor="middle" fill="#8a9aaa" fontSize="8" fontWeight="500">{t.label}</text>
            <text x={t.x + 40} y="203" textAnchor="middle" fill={t.sc} fontSize="7">{t.status}</text>
          </g>
        ))}
        {/* Blocking arrow КР → ОВ */}
        <line x1="230" y1="193" x2="250" y2="193" stroke="#c0392b" strokeWidth="1" markerEnd="url(#arrowRed)"/>
        <defs><marker id="arrowRed" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto"><polygon points="0,0 6,2 0,4" fill="#c0392b"/></marker></defs>

        {/* Milestones */}
        <g>
          <polygon points="200,228 208,238 200,248 192,238" fill="none" stroke="#7c6db5" strokeWidth="1"/>
          <text x="220" y="242" fill="#7c6db5" fontSize="8">Сдача заказчику — 15.09</text>
        </g>

        {/* DOCS */}
        <line x1="500" y1="110" x2="500" y2="125" stroke="#1a2a3a" strokeWidth="0.5"/>
        <rect x="430" y="125" width="180" height="28" rx="5" fill="#0e1020" stroke="#4a3a6a" strokeWidth="1"/>
        <text x="520" y="143" textAnchor="middle" fill="#7c6db5" fontSize="9">DOCS-67 — Договор</text>

        {/* HR */}
        <rect x="430" y="165" width="180" height="28" rx="5" fill="#0e1020" stroke="#5a4a2a" strokeWidth="1"/>
        <text x="520" y="183" textAnchor="middle" fill="#c49a3a" fontSize="9">HR-12 — Командировка</text>

        {/* Legend */}
        <rect x="20" y="275" width="660" height="48" rx="6" fill="#0b1018" stroke="#1a2535" strokeWidth="0.5"/>
        <text x="40" y="295" fill="#3a4a5a" fontSize="8" fontWeight="600">УСЛОВНЫЕ ОБОЗНАЧЕНИЯ:</text>
        <rect x="40" y="305" width="10" height="10" rx="2" fill="#0e1a28" stroke="#1a4a7a" strokeWidth="1"/>
        <text x="56" y="314" fill="#4a5a6a" fontSize="7">Портфель</text>
        <rect x="120" y="305" width="10" height="10" rx="2" fill="#0e1a28" stroke="#1a5c3a" strokeWidth="1"/>
        <text x="136" y="314" fill="#4a5a6a" fontSize="7">Проект</text>
        <rect x="190" y="305" width="10" height="10" rx="2" fill="#1a1510" stroke="#5a4a2a" strokeWidth="1"/>
        <text x="206" y="314" fill="#4a5a6a" fontSize="7">Epic</text>
        <line x1="260" y1="310" x2="280" y2="310" stroke="#c0392b" strokeWidth="1.5"/>
        <text x="286" y="314" fill="#4a5a6a" fontSize="7">Блокирует</text>
        <polygon points="348,305 352,310 348,315 344,310" fill="none" stroke="#7c6db5" strokeWidth="1"/>
        <text x="358" y="314" fill="#4a5a6a" fontSize="7">Веха</text>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════
// ROLE CARD (expandable)
// ══════════════════════════════════════

export function RoleCard({ initials, name, who, color, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${open ? 'border-white/10' : 'border-white/[0.06]'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: color + '15', color: color, fontFamily: 'var(--font-display)' }}>
          {initials}
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-[13px] font-semibold">{name}</div>
          <div className="text-[11px] text-white/25 truncate">{who}</div>
        </div>
        <span className={`text-white/15 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="px-4 pb-4 border-t border-white/[0.04]">{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════
// QUEUE BLOCK (for section 7)
// ══════════════════════════════════════

export function QueueBlock({ badge, badgeColor, name, template, children }) {
  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden my-3">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
        <span className="text-xs font-bold px-2.5 py-1 rounded" style={{ background: badgeColor + '15', color: badgeColor }}>{badge}</span>
        <div>
          <div className="text-[13px] font-semibold">{name}</div>
          <div className="text-[11px] text-white/25">Шаблон: {template}</div>
        </div>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ══════════════════════════════════════
// COMPARISON CARD (3-column)
// ══════════════════════════════════════

export function CompareCards({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
      {items.map((item, i) => (
        <div key={i} className={`border rounded-xl p-4 ${cardAccentMap[item.accent] || cardAccentMap.default}`}>
          <div className="text-[13px] font-semibold mb-1" style={item.titleColor ? { color: item.titleColor } : {}}>{item.title}</div>
          <div className="text-[13px] text-white/40 leading-[1.6]" dangerouslySetInnerHTML={{ __html: item.html }} />
        </div>
      ))}
    </div>
  );
}
