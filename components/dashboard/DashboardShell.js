'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ROLE_DASHBOARD } from '@/lib/dashboard-config.mjs';
import TasksWidget from './TasksWidget';
import AuditWidget from './AuditWidget';
import OnboardingWidget from './OnboardingWidget';
import QuickLinks from './QuickLinks';
import PortfolioSummary from './PortfolioSummary';
import TeamOnboarding from './TeamOnboarding';
import SystemStatus from './SystemStatus';
import WidgetPicker from './WidgetPicker';

export const WIDGET_REGISTRY = {
  my_tasks:          { title: 'Мои задачи',          desc: 'Задачи из Трекера, назначенные на вас',        size: 'half', minRole: null,       component: (p) => <TasksWidget title="Мои задачи" {...p} /> },
  project_tasks:     { title: 'Задачи проектов',     desc: 'Все задачи ваших проектов',                    size: 'half', minRole: 'gip',      component: (p) => <TasksWidget title="Задачи проектов" {...p} /> },
  crm_summary:       { title: 'CRM — лиды',          desc: 'Ваши лиды и сделки из CRM-очереди',            size: 'half', minRole: 'manager',  component: (p) => <TasksWidget title="CRM — мои лиды" {...p} /> },
  portfolio_summary: { title: 'Портфель проектов',    desc: 'Обзор всех проектов бюро',                     size: 'full', minRole: 'director', component: (p) => <PortfolioSummary {...p} /> },
  audit:             { title: 'Аудит качества',       desc: 'Без дедлайна, зависшие, просроченные',         size: 'full', minRole: 'gip',      component: (p) => <AuditWidget {...p} /> },
  onboarding:        { title: 'Онбординг',            desc: 'Чеклист для новых сотрудников',                size: 'half', minRole: null,       component: (p) => <OnboardingWidget userId={p.userId} /> },
  team_onboarding:   { title: 'Онбординг команды',    desc: 'Прогресс онбординга всех сотрудников',         size: 'full', minRole: 'exdir',    component: (p) => <TeamOnboarding /> },
  quick_links:       { title: 'Быстрые ссылки',       desc: 'Ссылки на Трекер, доски, создание задач',      size: 'half', minRole: null,       component: (p) => <QuickLinks queues={p.queues} /> },
  system_status:     { title: 'Статус системы',        desc: 'Подключения к Трекеру и Supabase',             size: 'half', minRole: null,       component: (p) => <SystemStatus {...p} /> },
};

const ROLE_LEVEL = { director: 5, exdir: 4, gip: 3, manager: 2, architect: 1, admin: 4 };
const STORAGE_KEY = 'craft_dashboard_widgets';

function loadWidgets(role) {
  if (typeof window === 'undefined') return null;
  try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY)); return s?.[role] || null; } catch { return null; }
}
function saveWidgets(role, w) {
  if (typeof window === 'undefined') return;
  try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; s[role] = w; localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export default function DashboardShell({ user }) {
  const role = user?.role || 'architect';
  const config = ROLE_DASHBOARD[role] || ROLE_DASHBOARD.architect;
  const trackerConnected = !!user?.trackerConnected;
  const userLevel = ROLE_LEVEL[role] || 1;

  const [widgets, setWidgets] = useState(config.widgets);
  const [showPicker, setShowPicker] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    const stored = loadWidgets(role);
    if (stored?.length > 0) setWidgets(stored);
    requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
  }, [role]);

  const updateWidgets = useCallback((w) => { setWidgets(w); saveWidgets(role, w); }, [role]);
  const resetWidgets = useCallback(() => { setWidgets(config.widgets); saveWidgets(role, config.widgets); }, [role, config.widgets]);

  // ── Drag & Drop ──
  const handleDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
  };
  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDragId(null);
    setDragOverId(null);
  };
  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragId) setDragOverId(id);
  };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    const fromIdx = widgets.indexOf(dragId);
    const toIdx = widgets.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...widgets];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, dragId);
    updateWidgets(next);
    setDragId(null);
    setDragOverId(null);
  };

  const available = Object.entries(WIDGET_REGISTRY).filter(([, w]) => !w.minRole || userLevel >= (ROLE_LEVEL[w.minRole] || 0));
  const widgetProps = { trackerConnected, userId: user?.id, queues: user?.queues || [] };

  const hour = new Date().getHours();
  const greet = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header
        className="mb-5 opacity-0 -translate-y-2 transition-all duration-500"
        style={mounted ? { opacity: 1, transform: 'translateY(0)' } : {}}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xs uppercase tracking-[0.12em] text-white/20">{config.label}</span>
          <span className="text-white/8">/</span>
          <span className="text-2xs text-white/12">{config.greeting}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-light tracking-tight">
            {greet}, <span className="text-white/40">{user?.name?.split(' ')[0] || 'коллега'}</span>
          </h1>
          <button
            onClick={() => setShowPicker(v => !v)}
            className="flex items-center gap-1.5 text-2xs text-white/20 hover:text-white/50 transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] active:scale-[0.97]"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              {showPicker
                ? <path d="M4 4l8 8M12 4l-8 8" />
                : <><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></>
              }
            </svg>
            <span>{showPicker ? 'Закрыть' : 'Виджеты'}</span>
          </button>
        </div>
      </header>

      {/* Picker */}
      <div className={`expand-section ${showPicker ? 'open' : ''} mb-5`}>
        <div>
          <WidgetPicker
            available={available}
            active={widgets}
            onChange={updateWidgets}
            onReset={resetWidgets}
            onClose={() => setShowPicker(false)}
          />
        </div>
      </div>

      {/* Widget grid — full workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {widgets.map((id, i) => {
          const w = WIDGET_REGISTRY[id];
          if (!w) return null;
          if (w.minRole && userLevel < (ROLE_LEVEL[w.minRole] || 0)) return null;
          const isOver = dragOverId === id && dragId !== id;

          return (
            <div
              key={id}
              draggable
              onDragStart={(e) => handleDragStart(e, id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, id)}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => handleDrop(e, id)}
              className={`
                ${w.size === 'full' ? 'lg:col-span-2' : ''}
                transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) cursor-grab active:cursor-grabbing
                ${isOver ? 'drag-over rounded-xl' : ''}
              `}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                transitionDelay: `${i * 60}ms`,
              }}
            >
              {w.component(widgetProps)}
            </div>
          );
        })}
      </div>

      {widgets.length === 0 && mounted && (
        <div className="text-center py-24 animate-fadeIn">
          <div className="text-[13px] text-white/20 mb-3">Дашборд пуст</div>
          <button onClick={() => setShowPicker(true)} className="text-[13px] text-craft-accent/50 hover:text-craft-accent transition-colors duration-200">
            Добавить виджеты
          </button>
        </div>
      )}
    </div>
  );
}
