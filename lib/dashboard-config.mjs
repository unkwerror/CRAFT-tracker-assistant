// ═══════════════════════════════════════════════════════
// Конфигурация дашборда по ролям (fallback при отсутствии БД)
// ═══════════════════════════════════════════════════════

export const ROLE_DASHBOARD = {
  director: {
    label: 'Генеральный директор',
    greeting: 'Обзор бюро',
    widgets: ['portfolio_summary', 'audit', 'team_onboarding', 'quick_links', 'system_status'],
  },
  exdir: {
    label: 'Исполнительный директор',
    greeting: 'Управление',
    widgets: ['my_tasks', 'onboarding', 'audit', 'team_onboarding', 'quick_links', 'system_status'],
  },
  gip: {
    label: 'ГИП',
    greeting: 'Мои проекты',
    widgets: ['my_tasks', 'project_tasks', 'audit', 'onboarding', 'quick_links'],
  },
  architect: {
    label: 'Архитектор / Инженер',
    greeting: 'Мои задачи',
    widgets: ['my_tasks', 'onboarding', 'quick_links', 'system_status'],
  },
  manager: {
    label: 'Менеджер по продажам',
    greeting: 'CRM и лиды',
    widgets: ['my_tasks', 'crm_summary', 'crm_widget', 'onboarding', 'quick_links'],
  },
  admin: {
    label: 'Администратор',
    greeting: 'Документооборот',
    widgets: ['my_tasks', 'onboarding', 'quick_links', 'system_status'],
  },
};
