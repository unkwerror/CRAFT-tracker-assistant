'use client';
import { useState, useEffect, useCallback } from 'react';
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
    render: (p) => <OnboardingWidget userId={p.userId} />,
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
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

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

    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!cancelled) setMounted(true);
    }));

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

  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };
  const onDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDragId(null);
    setDragOverId(null);
  };
  const onDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragId) setDragOverId(id);
  };
  const onDrop = (e, targetId) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    const from = widgets.indexOf(dragId);
    const to = widgets.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...widgets];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    updateWidgets(next);
    setDragId(null);
    setDragOverId(null);
  };

  const available = enabledKeys
    .map(key => WIDGET_REGISTRY[key] ? [key, WIDGET_REGISTRY[key]] : null)
    .filter(Boolean);

  const widgetProps = { trackerConnected, dbConnected, userId: user?.id, queues: user?.queues || [] };
  const hour = new Date().getHours();
  const greet = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div className="min-h-screen pb-8">
      <header
        className="mb-5 opacity-0 -translate-y-2 transition-all duration-500"
        style={mounted ? { opacity: 1, transform: 'translateY(0)' } : {}}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xs uppercase tracking-[0.12em] text-white/20">{user?.roleLabel || fallback.label}</span>
          <span className="text-white/8">/</span>
          <span className="text-2xs text-white/12">{fallback.greeting}</span>
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
                : <><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></>}
            </svg>
            <span>{showPicker ? 'Закрыть' : 'Виджеты'}</span>
          </button>
        </div>
      </header>

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

      {!loaded ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/5 border-t-white/20 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {widgets.map((id, i) => {
            const w = WIDGET_REGISTRY[id];
            if (!w) return null;
            const isOver = dragOverId === id && dragId !== id;

            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => onDragStart(e, id)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => onDragOver(e, id)}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => onDrop(e, id)}
                className={`
                  ${w.size === 'full' ? 'lg:col-span-2' : ''}
                  transition-all duration-500 cursor-grab active:cursor-grabbing
                  ${isOver ? 'drag-over rounded-xl' : ''}
                `}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                  transitionDelay: `${i * 60}ms`,
                }}
              >
                {w.render(widgetProps)}
              </div>
            );
          })}
        </div>
      )}

      {loaded && widgets.length === 0 && mounted && (
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
