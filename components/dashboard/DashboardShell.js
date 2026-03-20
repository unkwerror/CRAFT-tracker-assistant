'use client';
import { useState, useEffect, useCallback } from 'react';
import { ROLE_DASHBOARD } from '@/lib/dashboard-config.mjs';
import TasksWidget from './TasksWidget';
import AuditWidget from './AuditWidget';
import OnboardingWidget from './OnboardingWidget';
import QuickLinks from './QuickLinks';
import PortfolioSummary from './PortfolioSummary';
import TeamOnboarding from './TeamOnboarding';
import SystemStatus from './SystemStatus';
import WidgetPicker from './WidgetPicker';

// ── All available widgets ──
export const WIDGET_REGISTRY = {
  my_tasks: {
    title: 'Мои задачи',
    desc: 'Задачи из Трекера, назначенные на вас',
    size: 'half',
    minRole: null,
    component: (props) => <TasksWidget title="Мои задачи" {...props} />,
  },
  project_tasks: {
    title: 'Задачи проектов',
    desc: 'Все задачи ваших проектов',
    size: 'half',
    minRole: 'gip',
    component: (props) => <TasksWidget title="Задачи проектов" {...props} />,
  },
  crm_summary: {
    title: 'CRM — лиды',
    desc: 'Ваши лиды и сделки из CRM-очереди',
    size: 'half',
    minRole: 'manager',
    component: (props) => <TasksWidget title="CRM — мои лиды" {...props} />,
  },
  portfolio_summary: {
    title: 'Портфель проектов',
    desc: 'Обзор всех проектов бюро',
    size: 'full',
    minRole: 'director',
    component: (props) => <PortfolioSummary {...props} />,
  },
  audit: {
    title: 'Аудит качества',
    desc: 'Без дедлайна, зависшие, просроченные',
    size: 'full',
    minRole: 'gip',
    component: (props) => <AuditWidget {...props} />,
  },
  onboarding: {
    title: 'Онбординг',
    desc: 'Чеклист для новых сотрудников',
    size: 'half',
    minRole: null,
    component: (props) => <OnboardingWidget userId={props.userId} />,
  },
  team_onboarding: {
    title: 'Онбординг команды',
    desc: 'Прогресс онбординга всех сотрудников',
    size: 'full',
    minRole: 'exdir',
    component: (props) => <TeamOnboarding />,
  },
  quick_links: {
    title: 'Быстрые ссылки',
    desc: 'Ссылки на Трекер, доски, создание задач',
    size: 'half',
    minRole: null,
    component: (props) => <QuickLinks queues={props.queues} />,
  },
  system_status: {
    title: 'Статус системы',
    desc: 'Подключения к Трекеру и Supabase',
    size: 'half',
    minRole: null,
    component: (props) => <SystemStatus {...props} />,
  },
};

const ROLE_LEVEL = { director: 5, exdir: 4, gip: 3, manager: 2, architect: 1, admin: 4 };
const STORAGE_KEY = 'craft_dashboard_widgets';

function getStoredWidgets(role) {
  if (typeof window === 'undefined') return null;
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return s?.[role] || null;
  } catch { return null; }
}

function storeWidgets(role, widgets) {
  if (typeof window === 'undefined') return;
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    s[role] = widgets;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export default function DashboardShell({ user }) {
  const role = user?.role || 'architect';
  const config = ROLE_DASHBOARD[role] || ROLE_DASHBOARD.architect;
  const trackerConnected = !!user?.trackerConnected;
  const userLevel = ROLE_LEVEL[role] || 1;

  const [activeWidgets, setActiveWidgets] = useState(config.widgets);
  const [showPicker, setShowPicker] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredWidgets(role);
    if (stored && stored.length > 0) setActiveWidgets(stored);
    requestAnimationFrame(() => setMounted(true));
  }, [role]);

  const handleWidgetsChange = useCallback((w) => {
    setActiveWidgets(w);
    storeWidgets(role, w);
  }, [role]);

  const handleReset = useCallback(() => {
    setActiveWidgets(config.widgets);
    storeWidgets(role, config.widgets);
  }, [role, config.widgets]);

  const availableWidgets = Object.entries(WIDGET_REGISTRY).filter(([, w]) => {
    if (!w.minRole) return true;
    return userLevel >= (ROLE_LEVEL[w.minRole] || 0);
  });

  const widgetProps = { trackerConnected, userId: user?.id, queues: user?.queues || [] };

  const hour = new Date().getHours();
  const timeGreeting = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className={`mb-6 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xs uppercase tracking-[0.12em] text-white/20">{config.label}</span>
          <span className="text-white/10">/</span>
          <span className="text-2xs text-white/15">{config.greeting}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-light tracking-tight">
            {timeGreeting},{' '}
            <span className="text-white/50">{user?.name?.split(' ')[0] || 'коллега'}</span>
          </h1>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 text-2xs text-white/20 hover:text-white/50 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03]"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            <span>Виджеты</span>
          </button>
        </div>
      </header>

      {/* Widget Picker */}
      <div className={`transition-all duration-400 ease-out overflow-hidden ${showPicker ? 'max-h-[600px] opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
        <WidgetPicker
          available={availableWidgets}
          active={activeWidgets}
          onChange={handleWidgetsChange}
          onReset={handleReset}
          onClose={() => setShowPicker(false)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeWidgets.map((widgetId, index) => {
          const w = WIDGET_REGISTRY[widgetId];
          if (!w) return null;
          if (w.minRole && userLevel < (ROLE_LEVEL[w.minRole] || 0)) return null;

          return (
            <div
              key={widgetId}
              className={`
                ${w.size === 'full' ? 'lg:col-span-2' : ''}
                transition-all duration-500 ease-out
                ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: `${(index + 1) * 80}ms` }}
            >
              {w.component(widgetProps)}
            </div>
          );
        })}
      </div>

      {activeWidgets.length === 0 && (
        <div className={`text-center py-20 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-[13px] text-white/20 mb-3">Дашборд пуст</div>
          <button onClick={() => setShowPicker(true)} className="text-[13px] text-craft-accent/60 hover:text-craft-accent transition-colors">
            Добавить виджеты
          </button>
        </div>
      )}
    </div>
  );
}
