'use client';
import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { S0_Intro, S1_Philosophy, S2_Ranking } from '@/components/sections/block1';
import { S3_Kanban, S4_Tasks, S5_Rhythm } from '@/components/sections/block2';
import { S6_Concepts, S7_Queues, S8_Projects, S9_Links } from '@/components/sections/block3';
import { S10_CRM, S11_Production, S12_Docs } from '@/components/sections/block4';
import { S13_Subcontract, S14_Automations } from '@/components/sections/block5';
import { S15_Roles, S16_FirstDay, S17_CreateTask } from '@/components/sections/block6';
import { S18_Dashboards, S19_Access, S20_Time, S21_Roadmap, S22_Regulations, S23_AgentBridge } from '@/components/sections/block7';

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
  { id: 's23', label: 'Bridge Agent + Claude', group: 'Управление', component: S23_AgentBridge },
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
  const [compact, setCompact] = useState(false);

  const groups = groupSections(SECTIONS);
  const activeSection = SECTIONS.find(s => s.id === activeId);
  const ActiveComponent = activeSection?.component || S0_Intro;
  const activeIndex = Math.max(0, SECTIONS.findIndex(s => s.id === activeId));
  const progress = ((activeIndex + 1) / SECTIONS.length) * 100;

  const filteredGroups = useMemo(
    () =>
      groups
        .map(g => ({
          ...g,
          items: g.items.filter(i => i.label.toLowerCase().includes(search.toLowerCase())),
        }))
        .filter(g => g.items.length > 0),
    [groups, search]
  );

  const navigate = (id) => {
    setActiveId(id);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const prev = activeIndex > 0 ? SECTIONS[activeIndex - 1] : null;
  const next = activeIndex < SECTIONS.length - 1 ? SECTIONS[activeIndex + 1] : null;

  return (
    <div className="min-h-screen relative overflow-x-clip bg-craft-bg">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_420px_at_12%_-12%,rgba(201,160,255,0.12),transparent_62%),radial-gradient(1000px_460px_at_110%_6%,rgba(91,164,245,0.16),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:repeating-linear-gradient(125deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_26px)] [mask-image:radial-gradient(circle_at_50%_30%,black,transparent_75%)]" />

      <header className="fixed top-0 left-0 right-0 h-14 z-50 border-b border-white/[0.08] backdrop-blur-xl bg-[#0e0e0e]/85">
        <div className="h-full px-4 md:px-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="md:hidden w-8 h-8 rounded-md border border-white/[0.1] bg-white/[0.03] text-white/55"
            >
              ☰
            </button>
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.18em] uppercase text-white/35 font-display">Craft Guide</div>
              <div className="text-[11px] text-white/20 truncate">Neo-tribal / Y2K playbook</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompact((v) => !v)}
              className="text-[10px] uppercase tracking-[0.12em] px-2.5 py-1.5 rounded-md border border-white/[0.1] bg-white/[0.03] text-white/45 hover:text-white/70"
            >
              {compact ? 'full' : 'compact'}
            </button>
            <a href="/login" className="text-[11px] font-medium text-craft-accent/80 hover:text-craft-accent px-2.5 py-1.5 rounded-md border border-craft-accent/20 bg-craft-accent/[0.06]">
              Личный кабинет
            </a>
          </div>
        </div>
        <div className="h-[2px] w-full bg-white/[0.05]">
          <motion.div
            className="h-full bg-gradient-to-r from-craft-purple/80 via-craft-accent/80 to-craft-cyan/80"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </header>

      <aside className={`fixed top-14 left-0 w-[292px] h-[calc(100vh-3.5rem)] z-40 border-r border-white/[0.08] bg-craft-surface/95 backdrop-blur-xl overflow-y-auto transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-3 border-b border-white/[0.06]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по разделам"
              className="w-full rounded-lg border border-white/[0.09] bg-black/25 px-3 py-2 text-xs text-white/75 placeholder:text-white/25 focus:outline-none focus:border-craft-accent/35"
            />
          </div>
        </div>
        <nav className="py-2">
          {filteredGroups.map((g) => (
            <div key={g.label} className="mb-2">
              <div className="px-4 py-1 text-[9px] tracking-[0.16em] uppercase text-white/20 font-medium">{g.label}</div>
              {g.items.map((item) => {
                const active = activeId === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    whileHover={{ x: 2 }}
                    className={`w-full text-left flex items-center justify-between gap-2 px-4 py-2 text-[12px] border-l-2 transition-colors ${
                      active
                        ? 'border-l-craft-accent text-white/90 bg-craft-accent/[0.12]'
                        : 'border-l-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-craft-cyan' : 'bg-white/12'}`} />
                  </motion.button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/[0.06] text-[10px] text-white/18 flex items-center justify-between">
          <span>{activeIndex + 1}/{SECTIONS.length}</span>
          <span>v4.0 neo</span>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/65 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="md:ml-[292px] pt-16 min-h-screen">
        <div className={`${compact ? 'max-w-[900px]' : 'max-w-[1120px]'} mx-auto px-4 md:px-8 pb-24`}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26 }}
            className="mb-4 rounded-2xl border border-white/[0.08] bg-craft-surface/80 backdrop-blur-lg px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/24">Активный модуль</div>
                <div className="text-[15px] text-white/85 font-medium">{activeSection?.label}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.14em] text-white/20">{activeSection?.group}</div>
                <div className="text-[11px] text-white/35">Страница {activeIndex + 1}</div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.section
              key={activeId}
              initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-white/[0.08] bg-craft-surface/72 backdrop-blur-lg px-4 md:px-7 py-6 md:py-8 relative overflow-hidden"
            >
              <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-craft-accent/[0.08] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-craft-purple/[0.08] blur-3xl" />
              <div className="relative z-10">
                <ActiveComponent />
              </div>
            </motion.section>
          </AnimatePresence>

          <div className="mt-8 rounded-2xl border border-white/[0.08] bg-craft-surface/75 backdrop-blur-lg px-4 py-3 flex items-center justify-between gap-2">
            {prev ? (
              <motion.button whileTap={{ scale: 0.97 }} whileHover={{ x: -2 }} onClick={() => navigate(prev.id)} className="text-[12px] text-white/45 hover:text-white/80">
                ← {prev.label}
              </motion.button>
            ) : <div />}
            <span className="text-[10px] tracking-[0.16em] uppercase text-white/24">{activeIndex + 1} / {SECTIONS.length}</span>
            {next ? (
              <motion.button whileTap={{ scale: 0.97 }} whileHover={{ x: 2 }} onClick={() => navigate(next.id)} className="text-[12px] text-white/45 hover:text-white/80">
                {next.label} →
              </motion.button>
            ) : <div />}
          </div>
        </div>
      </main>
    </div>
  );
}
