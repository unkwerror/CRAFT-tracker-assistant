// ═══════════════════════════════════════════════════════
// Конфигурация дашборда по ролям (fallback при отсутствии БД)
// ═══════════════════════════════════════════════════════

export const ROLE_DASHBOARD = {
  director: {
    label: 'Генеральный директор',
    greeting: 'Обзор бюро',
    widgets: ['stats_bar', 'audit', 'funnel_crm', 'tasks_my', 'onboarding'],
  },
  exdir: {
    label: 'Исполнительный директор',
    greeting: 'Управление',
    widgets: ['stats_bar', 'funnel_crm', 'audit', 'tasks_my', 'onboarding'],
  },
  gip: {
    label: 'ГИП',
    greeting: 'Мои проекты',
    widgets: ['stats_bar', 'tasks_my', 'audit', 'onboarding'],
  },
  architect: {
    label: 'Архитектор / Инженер',
    greeting: 'Мои задачи',
    widgets: ['stats_bar', 'tasks_my', 'onboarding'],
  },
  manager: {
    label: 'Менеджер по продажам',
    greeting: 'CRM и лиды',
    widgets: ['stats_bar', 'funnel_crm', 'tasks_my', 'audit', 'onboarding'],
  },
  admin: {
    label: 'Администратор',
    greeting: 'Документооборот',
    widgets: ['stats_bar', 'tasks_my', 'onboarding'],
  },
};
