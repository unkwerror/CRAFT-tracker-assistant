// Dashboard widget visibility and config per role

export const ROLE_DASHBOARD = {
  director: {
    label: 'Генеральный директор',
    greeting: 'Обзор бюро',
    widgets: ['portfolio_summary', 'audit', 'team_onboarding', 'quick_links', 'system_status'],
    canViewAllTasks: true,
    canViewAudit: true,
    canManageRoles: false,
  },
  exdir: {
    label: 'Исполнительный директор',
    greeting: 'Управление',
    widgets: ['my_tasks', 'onboarding', 'audit', 'team_onboarding', 'quick_links', 'system_status'],
    canViewAllTasks: true,
    canViewAudit: true,
    canManageRoles: true,
  },
  gip: {
    label: 'ГИП',
    greeting: 'Мои проекты',
    widgets: ['my_tasks', 'project_tasks', 'audit', 'onboarding', 'quick_links'],
    canViewAllTasks: false,
    canViewAudit: true,
    canManageRoles: false,
  },
  architect: {
    label: 'Архитектор / Инженер',
    greeting: 'Мои задачи',
    widgets: ['my_tasks', 'onboarding', 'quick_links', 'system_status'],
    canViewAllTasks: false,
    canViewAudit: false,
    canManageRoles: false,
  },
  manager: {
    label: 'Менеджер по продажам',
    greeting: 'CRM и лиды',
    widgets: ['my_tasks', 'crm_summary', 'onboarding', 'quick_links'],
    canViewAllTasks: false,
    canViewAudit: false,
    canManageRoles: false,
  },
  admin: {
    label: 'Администратор',
    greeting: 'Документооборот',
    widgets: ['my_tasks', 'onboarding', 'quick_links', 'system_status'],
    canViewAllTasks: false,
    canViewAudit: false,
    canManageRoles: true,
  },
};

export const NAV_ITEMS = {
  common: [
    { id: 'dashboard', label: 'Дашборд', href: '/dashboard' },
    { id: 'guide', label: 'Гайд', href: '/guide' },
  ],
  admin_only: [
    { id: 'admin', label: 'Управление', href: '/admin' },
  ],
};
