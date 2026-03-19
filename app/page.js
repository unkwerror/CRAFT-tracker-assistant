'use client';
import { useState, useEffect } from 'react';
import { S0_Intro, S1_Philosophy, S2_Ranking } from '@/components/sections/block1';
import { S3_Kanban, S4_Tasks, S5_Rhythm } from '@/components/sections/block2';
import { S6_Concepts, S7_Queues, S8_Projects, S9_Links } from '@/components/sections/block3';
import { S10_CRM, S11_Production, S12_Docs } from '@/components/sections/block4';
import { S13_Subcontract, S14_Automations } from '@/components/sections/block5';
import { S15_Roles, S16_FirstDay, S17_CreateTask } from '@/components/sections/block6';
import { S18_Dashboards, S19_Access, S20_Time, S21_Roadmap, S22_Regulations } from '@/components/sections/block7';

const SECTIONS = [
  { id: 's0', label: 'Введение', group: 'Зачем и почему', component: S0_Intro },
  { id: 's1', label: 'Философия инструмента', group: 'Зачем и почему', component: S1_Philosophy },
  { id: 's2', label: 'Ранжирование разделов', group: 'Зачем и почему', component: S2_Ranking },
  { id: 's3', label: 'Kanban для бюро', group: 'Методология', component: S3_Kanban },
  { id: 's4', label: 'Как ставить задачи', group: 'Методология', component: S4_Tasks },
  { id: 's5', label: 'Еженедельный ритм', group: 'Методология', component: S5_Rhythm },
  { id: 's6', label: 'Ключевые понятия', group: 'Архитектура', component: S6_Concepts },
  { id: 's7', label: 'Четыре очереди бюро', group: 'Архитектура', component: S7_Queues },
  { id: 's8', label: 'Проекты и портфель', group: 'Архитектура', component: S8_Projects },
  { id: 's9', label: 'Связи между очередями', group: 'Архитектура', component: S9_Links },
  { id: 's10', label: 'CRM и воронка', group: 'Процессы', component: S10_CRM },
  { id: 's11', label: 'Производство объектов', group: 'Процессы', component: S11_Production },
  { id: 's12', label: 'Документооборот', group: 'Процессы', component: S12_Docs },
  { id: 's13', label: 'Субподряд и надзор', group: 'Процессы', component: S13_Subcontract },
  { id: 's14', label: 'Автоматизации', group: 'Процессы', component: S14_Automations },
  { id: 's15', label: 'Роли и чек-листы', group: 'Онбординг', component: S15_Roles },
  { id: 's16', label: 'Первый день в системе', group: 'Онбординг', component: S16_FirstDay },
  { id: 's17', label: 'Как создать задачу', group: 'Онбординг', component: S17_CreateTask },
  { id: 's18', label: 'Дашборды: как настроить', group: 'Онбординг', component: S18_Dashboards },
  { id: 's19', label: 'Права доступа', group: 'Управление', component: S19_Access },
  { id: 's20', label: 'Трудозатраты и КП', group: 'Управление', component: S20_Time },
  { id: 's21', label: 'Дорожная карта', group: 'Управление', component: S21_Roadmap },
  { id: 's22', label: 'Регламент команды', group: 'Управление', component: S22_Regulations },
];

function groupSections(sections) {
  const groups = [];
  let current = null;
  sections.forEach(s => {
    if (!current || current.label !== s.group) {
      current = { label: s.group, items: [] };
      groups.push(current);
    }
    current.items.push(s);
  });
  return groups;
}

export default function GuidePage() {
  const [activeId, setActiveId] = useState('s0');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');

  const groups = groupSections(SECTIONS);
  const activeSection = SECTIONS.find(s => s.id === activeId);
  const ActiveComponent = activeSection?.component || S0_Intro;

  const filteredGroups = groups.map(g => ({
    ...g,
    items: g.items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
  })).filter(g => g.items.length > 0);

  const navigate = (id) => {
    setActiveId(id);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    const handler = (e) => {
      const idx = SECTIONS.findIndex(s => s.id === activeId);
      if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && idx < SECTIONS.length - 1) { e.preventDefault(); navigate(SECTIONS[idx + 1].id); }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && idx > 0) { e.preventDefault(); navigate(SECTIONS[idx - 1].id); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeId]);

  return (
    <div className="min-h-screen" style={{ background: '#0e0e0e', fontFamily: 'var(--font-body)' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;500;600&family=Golos+Text:wght@400;500;600&display=swap');
        :root { --font-display: 'Unbounded', sans-serif; --font-body: 'Golos Text', sans-serif; }
        ::selection { background: #1a4a7a; color: #fff; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .page-enter { animation: fadeUp 0.2s ease; }
      `}</style>

      {/* TOP BAR */}
      <header className="fixed top-0 left-0 right-0 h-12 bg-[#0e0e0e]/95 backdrop-blur-sm border-b border-white/[0.06] flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden w-8 h-8 flex flex-col justify-center items-center gap-[5px]">
            <span className="w-[18px] h-[1.5px] bg-white/40 rounded-full" /><span className="w-[18px] h-[1.5px] bg-white/40 rounded-full" /><span className="w-[18px] h-[1.5px] bg-white/40 rounded-full" />
          </button>
          <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25" style={{ fontFamily: 'var(--font-display)' }}>Крафт Групп</span>
          <span className="text-[10px] text-white/10 hidden sm:inline">Яндекс Трекер — Руководство</span>
        </div>
        <a href="/login" className="text-[11px] font-medium text-sky-400/70 hover:text-sky-400 transition-colors border border-sky-400/15 rounded-md px-3 py-1 hover:border-sky-400/30">
          Личный кабинет
        </a>
      </header>

      {/* SIDEBAR */}
      <aside className={`fixed top-12 left-0 w-[268px] h-[calc(100vh-3rem)] bg-[#161616] border-r border-white/[0.06] overflow-y-auto z-40 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-3 pb-1">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/15 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по разделам"
              className="w-full bg-[#1e1e1e] border border-white/[0.07] rounded-lg px-2.5 py-2 pl-8 text-xs text-white/70 outline-none focus:border-white/15 placeholder-white/15 transition-colors" />
          </div>
        </div>
        <nav className="flex-1 py-2">
          {filteredGroups.map(g => (
            <div key={g.label} className="mb-1">
              <div className="px-5 py-1.5 text-[9px] font-semibold tracking-[0.12em] uppercase text-white/15">{g.label}</div>
              {g.items.map(item => (
                <button key={item.id} onClick={() => navigate(item.id)}
                  className={`w-full text-left flex items-center gap-2.5 px-5 py-[7px] text-[12px] border-l-2 transition-all
                    ${activeId === item.id ? 'border-l-sky-400/60 text-sky-400/80 bg-sky-400/[0.04]' : 'border-l-transparent text-white/30 hover:text-white/50 hover:bg-white/[0.02]'}`}>
                  <span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 transition-colors ${activeId === item.id ? 'bg-sky-400' : 'bg-white/10'}`} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/[0.04] flex items-center justify-between">
          <span className="text-[10px] text-white/10">v3.0 — Март 2026</span>
          <span className="text-[10px] text-white/10">{SECTIONS.length} разделов</span>
        </div>
      </aside>

      {/* OVERLAY */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN */}
      <main className="md:ml-[268px] pt-12 min-h-screen">
        <div className="max-w-[820px] px-6 sm:px-14 pb-24 page-enter" key={activeId}>
          <ActiveComponent />
          {/* Page nav */}
          <div className="flex justify-between items-center mt-12 pt-6 border-t border-white/[0.04]">
            {(() => {
              const idx = SECTIONS.findIndex(s => s.id === activeId);
              const prev = idx > 0 ? SECTIONS[idx - 1] : null;
              const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;
              return (<>
                {prev ? <button onClick={() => navigate(prev.id)} className="text-[12px] text-white/25 hover:text-white/50 transition-colors">← {prev.label}</button> : <div />}
                <span className="text-[10px] text-white/10">{idx + 1} / {SECTIONS.length}</span>
                {next ? <button onClick={() => navigate(next.id)} className="text-[12px] text-white/25 hover:text-white/50 transition-colors">{next.label} →</button> : <div />}
              </>);
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}
