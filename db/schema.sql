-- ═══════════════════════════════════════════════════════
-- Крафт Ассистент — Схема БД
-- Версия: 3.0 (Март 2026)
--
-- Запуск полной миграции:
--   psql $DATABASE_URL -f db/schema.sql
--
-- Безопасно запускать повторно (IF NOT EXISTS везде)
-- ═══════════════════════════════════════════════════════


-- ─────────────────────────────────────
-- 1. ПОЛЬЗОВАТЕЛИ
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  yandex_uid    TEXT UNIQUE NOT NULL,
  tracker_login TEXT,
  name          TEXT NOT NULL,
  email         TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'architect',
  office        TEXT DEFAULT 'tyumen',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_yandex ON users(yandex_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

COMMENT ON TABLE users IS 'Пользователи системы, создаются при первом OAuth-логине';
COMMENT ON COLUMN users.role IS 'Ключ роли: director, exdir, gip, architect, manager, admin';
COMMENT ON COLUMN users.office IS 'Офис: tyumen, ekaterinburg';
COMMENT ON COLUMN users.is_active IS 'Деактивированный пользователь не может войти';


-- ─────────────────────────────────────
-- 2. НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ
-- Заменяет localStorage — синхронизируется между устройствами
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_settings (
  id            SERIAL PRIMARY KEY,
  user_id       INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme         TEXT DEFAULT 'dark',
  sidebar_open  BOOLEAN DEFAULT TRUE,
  notify_email  BOOLEAN DEFAULT TRUE,
  notify_push   BOOLEAN DEFAULT FALSE,
  notify_telegram BOOLEAN DEFAULT FALSE,
  telegram_chat_id TEXT,
  locale        TEXT DEFAULT 'ru',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_settings IS 'Персональные настройки, одна строка на пользователя';


-- ─────────────────────────────────────
-- 3. РОЛИ И ПРАВА
-- Роли из БД, не из кода — можно добавлять без деплоя
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  color       TEXT DEFAULT '#7A8899',
  level       INT DEFAULT 1,
  queues      JSONB DEFAULT '[]',
  is_system   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Справочник ролей. is_system=true нельзя удалить';
COMMENT ON COLUMN roles.key IS 'Уникальный ключ: director, exdir, gip, architect, manager, admin';
COMMENT ON COLUMN roles.level IS 'Числовой уровень для сравнений: director=5, architect=1';
COMMENT ON COLUMN roles.queues IS 'Доступ к очередям: ["CRM:full","PROJ:read"]';

-- Начальные роли (идемпотентно)
INSERT INTO roles (key, label, color, level, queues, is_system) VALUES
  ('director',  'Генеральный директор',       '#5BA4F5', 5, '["CRM:read","PROJ:read","DOCS:read","HR:read"]', TRUE),
  ('exdir',     'Исполнительный директор',     '#C9A0FF', 4, '["CRM:full","PROJ:full","DOCS:full","HR:full"]', TRUE),
  ('gip',       'ГИП',                          '#42C774', 3, '["PROJ:full","DOCS:read","HR:own"]',             TRUE),
  ('architect', 'Архитектор / Инженер',         '#FFB155', 1, '["PROJ:own","HR:own"]',                          TRUE),
  ('manager',   'Менеджер по продажам',         '#6DD8E0', 2, '["CRM:full","PROJ:read"]',                       TRUE),
  ('admin',     'Администратор',                '#7A8899', 4, '["DOCS:full","HR:full"]',                        TRUE)
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────
-- 4. РЕЕСТР ВИДЖЕТОВ
-- Виджеты из БД — можно добавлять без деплоя
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS widgets (
  id            SERIAL PRIMARY KEY,
  key           TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  size          TEXT DEFAULT 'half',
  component     TEXT NOT NULL,
  allowed_roles JSONB DEFAULT '["*"]',
  default_for   JSONB DEFAULT '[]',
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 100,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE widgets IS 'Реестр доступных виджетов дашборда';
COMMENT ON COLUMN widgets.key IS 'Уникальный ключ: my_tasks, crm_widget, audit';
COMMENT ON COLUMN widgets.component IS 'Имя React-компонента: TasksWidget, CrmWidget';
COMMENT ON COLUMN widgets.allowed_roles IS 'Роли с доступом: ["*"] = все, ["manager","exdir"] = конкретные';
COMMENT ON COLUMN widgets.default_for IS 'Роли для которых виджет включён по умолчанию при первом логине';
COMMENT ON COLUMN widgets.size IS 'Размер на сетке: half (1 колонка), full (2 колонки)';

-- Начальные виджеты
INSERT INTO widgets (key, title, description, size, component, allowed_roles, default_for, sort_order) VALUES
  ('my_tasks',          'Мои задачи',          'Задачи из Трекера, назначенные на вас',        'half', 'TasksWidget',       '["*"]',                                        '["*"]',                                10),
  ('quick_links',       'Быстрые ссылки',      'Ссылки на Трекер, доски, создание задач',      'half', 'QuickLinks',        '["*"]',                                        '["*"]',                                20),
  ('onboarding',        'Онбординг',            'Чеклист для новых сотрудников',                'half', 'OnboardingWidget',  '["*"]',                                        '["*"]',                                30),
  ('system_status',     'Статус системы',        'Подключения к Трекеру и БД',                   'half', 'SystemStatus',      '["*"]',                                        '["exdir","admin"]',                    90),
  ('crm_widget',        'CRM — Воронка',         'Канбан или список лидов из CRM-очереди',       'full', 'CrmWidget',         '["manager","exdir","director"]',               '["manager","exdir"]',                  15),
  ('project_tasks',     'Задачи проектов',      'Все задачи ваших проектов',                    'half', 'TasksWidget',       '["gip","architect","exdir","director"]',        '["gip"]',                              25),
  ('audit',             'Аудит качества',       'Без дедлайна, зависшие, просроченные',         'full', 'AuditWidget',       '["gip","exdir","director"]',                   '["gip","exdir"]',                      40),
  ('portfolio_summary', 'Портфель проектов',    'Обзор всех проектов бюро',                     'full', 'PortfolioSummary',  '["exdir","director"]',                         '["exdir","director"]',                 50),
  ('team_onboarding',   'Онбординг команды',    'Прогресс онбординга всех сотрудников',         'full', 'TeamOnboarding',    '["exdir","admin"]',                            '["exdir"]',                            60)
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────
-- 5. ДОСТУП К ВИДЖЕТАМ (per user)
-- Переопределяет дефолты из widgets.default_for
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS widget_access (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  widget_id   TEXT NOT NULL REFERENCES widgets(key) ON DELETE CASCADE,
  enabled     BOOLEAN DEFAULT TRUE,
  settings    JSONB DEFAULT '{}',
  granted_by  INT REFERENCES users(id) ON DELETE SET NULL,
  granted_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, widget_id)
);

CREATE INDEX IF NOT EXISTS idx_widget_access_user ON widget_access(user_id);

COMMENT ON TABLE widget_access IS 'Индивидуальный доступ к виджетам, задаётся из админки';
COMMENT ON COLUMN widget_access.settings IS 'Настройки виджета: {"view":"kanban"} для CRM, {"queue":"PROJ"} для задач';
COMMENT ON COLUMN widget_access.granted_by IS 'Кто выдал доступ (user_id админа)';


-- ─────────────────────────────────────
-- 6. РАСКЛАДКА ДАШБОРДА
-- Порядок и расположение виджетов — вместо localStorage
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id          SERIAL PRIMARY KEY,
  user_id     INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  layout      JSONB DEFAULT '[]',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE dashboard_layouts IS 'Порядок виджетов на дашборде пользователя';
COMMENT ON COLUMN dashboard_layouts.layout IS 'Массив ключей виджетов в порядке отображения: ["my_tasks","crm_widget","audit"]';


-- ─────────────────────────────────────
-- 7. ОНБОРДИНГ
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id) ON DELETE CASCADE,
  step_id       INT NOT NULL,
  completed     BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  UNIQUE(user_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding(user_id);

COMMENT ON TABLE onboarding IS 'Прогресс онбординга: 10 шагов на пользователя';


-- ─────────────────────────────────────
-- 8. ЖУРНАЛ ДЕЙСТВИЙ (AUDIT LOG)
-- Кто, что, когда — для безопасности и отчётности
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

COMMENT ON TABLE audit_log IS 'Журнал всех значимых действий в системе';
COMMENT ON COLUMN audit_log.action IS 'Действие: role_changed, widget_granted, user_deactivated, login, logout';
COMMENT ON COLUMN audit_log.entity_type IS 'Тип сущности: user, widget, onboarding, setting';
COMMENT ON COLUMN audit_log.entity_id IS 'ID сущности (строка для универсальности)';

-- Примеры записей audit_log:
-- action='role_changed',    entity_type='user', entity_id='5', old_value='{"role":"architect"}', new_value='{"role":"gip"}'
-- action='widget_granted',  entity_type='widget', entity_id='crm_widget', new_value='{"user_id":5}'
-- action='login',           entity_type='user', entity_id='3', new_value='{"ip":"1.2.3.4"}'


-- ─────────────────────────────────────
-- 9. УВЕДОМЛЕНИЯ (IN-APP)
-- Для будущих уведомлений внутри дашборда
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'info',
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'In-app уведомления на дашборде';
COMMENT ON COLUMN notifications.type IS 'Тип: info, warning, success, error';
COMMENT ON COLUMN notifications.link IS 'Ссылка при клике: /dashboard, /admin, https://tracker.yandex.ru/CRM-15';


-- ═══════════════════════════════════════════════════════
-- ДИАГРАММА СВЯЗЕЙ
-- ═══════════════════════════════════════════════════════
--
--  users ─────┬──── user_settings     (1:1)
--             ├──── onboarding         (1:N)
--             ├──── widget_access      (1:N) ──── widgets
--             ├──── dashboard_layouts  (1:1)
--             ├──── audit_log          (1:N)
--             └──── notifications      (1:N)
--
--  roles      ←──── users.role (FK по ключу, не по id)
--  widgets    ←──── widget_access.widget_id (FK по ключу)
--
-- ═══════════════════════════════════════════════════════
