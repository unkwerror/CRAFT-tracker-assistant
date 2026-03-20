'use client';
import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DndContext, PointerSensor, TouchSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ROLE_DASHBOARD } from '@/lib/dashboard-config.mjs';
import QueueTasks from './QueueTasks';
import CrmKanban from './CrmKanban';
import StatsBar from './StatsBar';
import FunnelChart from './FunnelChart';
import AuditWidget from './AuditWidget';
import OnboardingWidget from './OnboardingWidget';
import QuickLinks from './QuickLinks';
import PortfolioSummary from './PortfolioSummary';
import TeamOnboarding from './TeamOnboarding';
import SystemStatus from './SystemStatus';
import WidgetPicker from './WidgetPicker';
import CrmAnalytics from './CrmAnalytics';
import CrmTimeline from './CrmTimeline';
import LeadAging from './LeadAging';
import BrandIllustration from './BrandIllustration';

/**
 * Widget registry: maps widget key → { render, title, desc, size }.
 * Keys must match the DB `widgets.key` column.
 */
const WIDGET_REGISTRY = {
  // ── DB keys (canonical) ──
  stats_bar: {
    render: (p) => <StatsBar trackerConnected={p.trackerConnected} />,
    title: 'Сводка', desc: 'Ключевые метрики', size: 'full',
  },
  tasks_my: {
    render: (p) => <QueueTasks title="Мои задачи" trackerConnected={p.trackerConnected} emptyMessage="Нет активных задач" />,
    title: 'Мои задачи', desc: 'Задачи из Трекера', size: 'half',
  },
  tasks_crm: {
    render: (p) => <QueueTasks title="CRM — Лиды" queueKey="CRM" trackerConnected={p.trackerConnected} emptyMessage="Нет лидов" />,
    title: 'CRM — лиды', desc: 'Задачи из CRM-очереди', size: 'half',
  },
  kanban_crm: {
    render: (p) => <CrmKanban trackerConnected={p.trackerConnected} />,
    title: 'CRM — Воронка', desc: 'Канбан лидов из CRM', size: 'full',
  },
  tasks_proj: {
    render: (p) => <QueueTasks title="Задачи проектов" queueKey="PROJ" trackerConnected={p.trackerConnected} emptyMessage="Нет задач в проектах" />,
    title: 'Задачи проектов', desc: 'Все задачи ваших проектов', size: 'half',
  },
  funnel_crm: {
    render: (p) => <FunnelChart trackerConnected={p.trackerConnected} />,
    title: 'Воронка CRM', desc: 'Визуализация воронки продаж', size: 'half',
  },
  quick_links: {
    render: (p) => <QuickLinks queues={p.queues} />,
    title: 'Быстрые ссылки', desc: 'Ссылки на Трекер и доски', size: 'half',
  },
  onboarding: {
    render: (p) => <OnboardingWidget userId={p.userId} useDb={p.dbConnected} />,
    title: 'Онбординг', desc: 'Чеклист для новых сотрудников', size: 'half',
  },
  audit: {
    render: (p) => <AuditWidget {...p} />,
    title: 'Аудит качества', desc: 'Без дедлайна, зависшие, просрочки', size: 'full',
  },
  portfolio_summary: {
    render: (p) => <PortfolioSummary {...p} />,
    title: 'Портфель проектов', desc: 'Обзор всех проектов бюро', size: 'full',
  },
  team_onboarding: {
    render: () => <TeamOnboarding />,
    title: 'Онбординг команды', desc: 'Прогресс онбординга всех', size: 'full',
  },
  system_status: {
    render: (p) => <SystemStatus {...p} />,
    title: 'Статус системы', desc: 'Подключения к Трекеру и БД', size: 'half',
  },
  crm_analytics: {
    render: (p) => <CrmAnalytics trackerConnected={p.trackerConnected} />,
    title: 'CRM Аналитика', desc: 'Скоринг, прогноз, velocity, аномалии', size: 'full',
  },
  crm_timeline: {
    render: (p) => <CrmTimeline trackerConnected={p.trackerConnected} />,
    title: 'CRM — Лента', desc: 'Последние события CRM', size: 'half',
  },
  lead_aging: {
    render: (p) => <LeadAging trackerConnected={p.trackerConnected} />,
    title: 'Застрявшие лиды', desc: 'Лиды без обновлений', size: 'half',
  },

};

export { WIDGET_REGISTRY };

export default function DashboardShell({ user }) {
  const role = user?.role || 'architect';
  const fallback = ROLE_DASHBOARD[role] || ROLE_DASHBOARD.architect;
  const trackerConnected = !!user?.trackerConnected;
  const dbConnected = !!user?.dbConnected;

  const [widgets, setWidgets] = useState([]);
  const [enabledKeys, setEnabledKeys] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeDragId, setActiveDragId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/dashboard/layout')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (cancelled) return;
        const layout = data.layout || [];
        const enabled = data.enabledKeys || [];
        setWidgets(layout.length > 0 ? layout : (enabled.length > 0 ? enabled : fallback.widgets));
        setEnabledKeys(enabled.length > 0 ? enabled : fallback.widgets);
      })
      .catch(() => {
        if (cancelled) return;
        setWidgets(fallback.widgets);
        setEnabledKeys(fallback.widgets);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  }, [role]);

  const persistLayout = useCallback((layout) => {
    fetch('/api/dashboard/layout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout }),
    }).catch(() => {});
  }, []);

  const updateWidgets = useCallback((w) => {
    setWidgets(w);
    persistLayout(w);
  }, [persistLayout]);

  const resetWidgets = useCallback(() => {
    const defaults = enabledKeys.length > 0 ? enabledKeys : fallback.widgets;
    setWidgets(defaults);
    persistLayout(defaults);
  }, [enabledKeys, fallback.widgets, persistLayout]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDndStart = useCallback((event) => {
    setActiveDragId(event.active?.id ?? null);
  }, []);

  const onDndEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = widgets.indexOf(active.id);
    const newIndex = widgets.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    updateWidgets(arrayMove(widgets, oldIndex, newIndex));
  }, [widgets, updateWidgets]);

  const onDndCancel = useCallback(() => setActiveDragId(null), []);

  const available = enabledKeys
    .map(key => WIDGET_REGISTRY[key] ? [key, WIDGET_REGISTRY[key]] : null)
    .filter(Boolean);

  const widgetProps = { trackerConnected, dbConnected, userId: user?.id, queues: user?.queues || [] };
  const hour = new Date().getHours();
  const greet = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  const dashboardState = !loaded
    ? 'loading'
    : (!trackerConnected || !dbConnected)
      ? 'error'
      : (widgets.length === 0 ? 'idle' : 'success');
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.18 } },
  };

  return (
    <div className="min-h-screen pb-8">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mb-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xs uppercase tracking-[0.12em] text-white/20">{user?.roleLabel || fallback.label}</span>
          <span className="text-white/8">/</span>
          <span className="text-2xs text-white/12">{fallback.greeting}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-display font-light tracking-tight">
            {greet}, <span className="text-white/40">{user?.name?.split(' ')[0] || 'коллега'}</span>
          </h1>
          <div className="hidden xl:block w-[220px] h-[80px]">
            <BrandIllustration state={dashboardState} className="h-full" />
          </div>
          <motion.button
            onClick={() => setShowPicker(v => !v)}
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -1 }}
            className="flex items-center gap-1.5 text-2xs text-white/20 hover:text-white/50 transition-colors duration-200 px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              {showPicker
                ? <path d="M4 4l8 8M12 4l-8 8" />
                : <><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></>}
            </svg>
            <span>{showPicker ? 'Закрыть' : 'Виджеты'}</span>
          </motion.button>
        </div>
      </motion.header>

      <AnimatePresence initial={false}>
        {showPicker && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5 overflow-hidden"
          >
            <WidgetPicker
              available={available}
              active={widgets}
              onChange={updateWidgets}
              onReset={resetWidgets}
              onClose={() => setShowPicker(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!loaded ? (
        <div className="flex justify-center py-20">
          <motion.div
            className="w-6 h-6 border-2 border-white/5 border-t-white/20 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDndStart}
          onDragEnd={onDndEnd}
          onDragCancel={onDndCancel}
        >
          <SortableContext items={widgets} strategy={rectSortingStrategy}>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 lg:grid-cols-2 gap-3"
            >
              <AnimatePresence>
                {widgets.map((id) => {
                  const w = WIDGET_REGISTRY[id];
                  if (!w) return null;
                  return (
                    <SortableWidget
                      key={id}
                      id={id}
                      full={w.size === 'full'}
                      isActive={activeDragId === id}
                      variants={item}
                    >
                      {w.render(widgetProps)}
                    </SortableWidget>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </SortableContext>
        </DndContext>
      )}

      <AnimatePresence>
        {loaded && widgets.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-center py-24"
          >
            <div className="text-[13px] text-white/20 mb-3">Дашборд пуст</div>
            <div className="w-[280px] h-[120px] mx-auto mb-5">
              <BrandIllustration state="idle" className="h-full" />
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -1 }}
              onClick={() => setShowPicker(true)}
              className="text-[13px] text-craft-accent/50 hover:text-craft-accent transition-colors duration-200"
            >
              Добавить виджеты
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableWidget({ id, full, isActive, children, variants }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 'auto',
  };
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      variants={variants}
      exit="exit"
      layout
      className={`${full ? 'lg:col-span-2' : ''} relative ${
        isDragging || isActive ? 'opacity-70 scale-[0.99] ring-2 ring-craft-accent/25 rounded-xl' : ''
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute right-2 top-2 z-20 w-6 h-6 rounded-md bg-black/25 border border-white/[0.08] text-white/30 hover:text-white/60 hover:bg-black/35 cursor-grab active:cursor-grabbing"
        title="Перетащить виджет"
        aria-label="Перетащить виджет"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 3h6M5 8h6M5 13h6" />
        </svg>
      </button>
      {children}
    </motion.div>
  );
}
