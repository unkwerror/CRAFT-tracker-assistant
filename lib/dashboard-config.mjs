// ═══════════════════════════════════════════════════════
// Конфигурация дашборда по ролям (fallback при отсутствии БД)
// ═══════════════════════════════════════════════════════

export const ROLE_DASHBOARD = {
  director: {
    label: 'Генеральный директор',
    greeting: 'Обзор бюро',
    widgets: ['stats_bar', 'portfolio_summary', 'audit', 'team_onboarding', 'quick_links', 'system_status'],
  },
  exdir: {
    label: 'Исполнительный директор',
    greeting: 'Управление',
    widgets: ['stats_bar', 'tasks_my', 'kanban_crm', 'crm_analytics', 'funnel_crm', 'audit', 'team_onboarding', 'quick_links', 'system_status'],
  },
  gip: {
    label: 'ГИП',
    greeting: 'Мои проекты',
    widgets: ['stats_bar', 'tasks_my', 'tasks_proj', 'audit', 'onboarding', 'quick_links'],
  },
  architect: {
    label: 'Архитектор / Инженер',
    greeting: 'Мои задачи',
    widgets: ['stats_bar', 'tasks_my', 'onboarding', 'quick_links', 'system_status'],
  },
  manager: {
    label: 'Менеджер по продажам',
    greeting: 'CRM и лиды',
    widgets: ['stats_bar', 'kanban_crm', 'crm_analytics', 'funnel_crm', 'crm_timeline', 'lead_aging', 'tasks_my', 'quick_links'],
  },
  admin: {
    label: 'Администратор',
    greeting: 'Документооборот',
    widgets: ['stats_bar', 'tasks_my', 'onboarding', 'quick_links', 'system_status'],
  },
};
