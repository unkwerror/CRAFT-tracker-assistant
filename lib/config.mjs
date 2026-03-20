// ═══════════════════════════════════════════════════════
// Конфигурация приложения
// ═══════════════════════════════════════════════════════

// ─── Onboarding ───
export const ONBOARDING_STEPS = [
  { id: 1, title: 'Войти в Трекер', desc: 'Откройте tracker.yandex.ru и войдите рабочим аккаунтом', link: 'https://tracker.yandex.ru' },
  { id: 2, title: 'Установить мобильное приложение', desc: 'Скачайте «Яндекс Трекер» на телефон', link: null },
  { id: 3, title: 'Настроить «Мою страницу»', desc: 'Добавьте виджет «Мои задачи» на стартовую', link: 'https://tracker.yandex.ru/pages/my' },
  { id: 4, title: 'Найти свои задачи', desc: 'Фильтр: Исполнитель = Я', link: null },
  { id: 5, title: 'Открыть задачу', desc: 'Кликните на любую задачу, прочитайте описание', link: null },
  { id: 6, title: 'Перевести задачу «В работе»', desc: 'Нажмите кнопку смены статуса', link: null },
  { id: 7, title: 'Написать комментарий', desc: 'Добавьте комментарий к любой задаче', link: null },
  { id: 8, title: 'Внести время', desc: 'Правая панель → Учёт времени → введите «1ч»', link: null },
  { id: 9, title: 'Открыть канбан-доску', desc: 'Перейдите на доску вашей очереди', link: null },
  { id: 10, title: 'Настроить уведомления', desc: 'Включите email и push-уведомления', link: null },
];

// ─── Email → Role (auto-assign at first login) ───
export const EMAIL_ROLE_MAP = {
  'arch2@craft72.ru': 'exdir',
};

// ─── Роли (label, color, queues) — fallback при отсутствии БД ───
export const ROLES = {
  director: { label: 'Генеральный директор', color: '#5BA4F5', queues: ['CRM:read', 'PROJ:read', 'DOCS:read', 'HR:read'] },
  exdir: { label: 'Исполнительный директор', color: '#C9A0FF', queues: ['CRM:full', 'PROJ:full', 'DOCS:full', 'HR:full'] },
  gip: { label: 'ГИП', color: '#42C774', queues: ['PROJ:full', 'DOCS:read', 'HR:own'] },
  architect: { label: 'Архитектор / Инженер', color: '#FFB155', queues: ['PROJ:own', 'HR:own'] },
  manager: { label: 'Менеджер по продажам', color: '#6DD8E0', queues: ['CRM:full', 'PROJ:read'] },
  admin: { label: 'Администратор', color: '#7A8899', queues: ['DOCS:full', 'HR:full'] },
};

/** @deprecated Используйте ROLES */
export const ROLE_FALLBACK = ROLES;

// ─── Админ-доступ ───
export const ADMIN_ROLES = ['exdir', 'admin'];
