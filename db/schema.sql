-- ═══════════════════════════════════════════════════════
-- Крафт Ассистент — Схема БД
-- Версия: 4.0 (Март 2026)
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


-- ─────────────────────────────────────
-- 2. НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ
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


-- ─────────────────────────────────────
-- 3. РОЛИ И ПРАВА
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  color       TEXT DEFAULT '#7A8899',
  level       INT DEFAULT 1,
  queues      JSONB DEFAULT '[]',
  permissions JSONB DEFAULT '[]',
  is_system   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (key, label, color, level, queues, permissions, is_system) VALUES
  ('director',  'Генеральный директор',   '#5BA4F5', 5,
    '["CRM:read","PROJ:read","DOCS:read","HR:read"]',
    '["admin:panel","crm:read","proj:read","docs:read","hr:read"]', TRUE),
  ('exdir',     'Исполнительный директор', '#C9A0FF', 4,
    '["CRM:full","PROJ:full","DOCS:full","HR:full"]',
    '["admin:panel","admin:roles","admin:widgets","crm:read","crm:write","crm:transition","proj:read","proj:write","docs:read","docs:write","hr:read","hr:write"]', TRUE),
  ('gip',       'ГИП',                    '#42C774', 3,
    '["PROJ:full","DOCS:read","HR:own"]',
    '["proj:read","proj:write","docs:read","hr:read"]', TRUE),
  ('architect', 'Архитектор / Инженер',   '#FFB155', 1,
    '["PROJ:own","HR:own"]',
    '["proj:read","proj:write","hr:read"]', TRUE),
  ('manager',   'Менеджер по продажам',   '#6DD8E0', 2,
    '["CRM:full","PROJ:read"]',
    '["crm:read","crm:write","crm:transition","proj:read"]', TRUE),
  ('admin',     'Администратор',          '#7A8899', 4,
    '["DOCS:full","HR:full"]',
    '["admin:panel","admin:widgets","docs:read","docs:write","hr:read","hr:write"]', TRUE)
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────
-- 4. РЕЕСТР ВИДЖЕТОВ
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS widgets (
  id            SERIAL PRIMARY KEY,
  key           TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  size          TEXT DEFAULT 'half',
  component     TEXT NOT NULL,
  default_settings JSONB DEFAULT '{}',
  allowed_roles JSONB DEFAULT '["*"]',
  default_for   JSONB DEFAULT '[]',
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 100,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO widgets (key, title, description, size, component, default_settings, allowed_roles, default_for, sort_order) VALUES
  ('stats_bar',         'Сводка',              'Ключевые метрики в реальном времени',          'full', 'StatsBar',          '{}',                                           '["*"]',                                        '["*"]',                                5),
  ('tasks_my',          'Мои задачи',          'Задачи из Трекера, назначенные на вас',        'half', 'TasksWidget',       '{"queue":null,"filter":"assignee=me"}',        '["*"]',                                        '["*"]',                                10),
  ('tasks_crm',         'CRM — Лиды',          'Задачи из CRM-очереди',                        'half', 'TasksWidget',       '{"queue":"CRM"}',                              '["manager","exdir","director"]',               '["manager","exdir"]',                  12),
  ('kanban_crm',        'CRM — Воронка',       'Канбан-доска CRM с drag-and-drop',             'full', 'CrmKanban',         '{"queue":"CRM"}',                              '["manager","exdir","director"]',               '["manager","exdir"]',                  15),
  ('tasks_proj',        'Задачи проектов',     'Задачи из PROJ-очереди',                       'half', 'TasksWidget',       '{"queue":"PROJ"}',                             '["gip","architect","exdir","director"]',        '["gip"]',                              20),
  ('quick_links',       'Быстрые ссылки',      'Ссылки на Трекер, доски, создание задач',      'half', 'QuickLinks',        '{}',                                           '["*"]',                                        '["*"]',                                25),
  ('onboarding',        'Онбординг',            'Чеклист для новых сотрудников',                'half', 'OnboardingWidget',  '{}',                                           '["*"]',                                        '["*"]',                                30),
  ('funnel_crm',        'Воронка CRM',         'Визуализация воронки продаж',                  'half', 'FunnelChart',       '{"queue":"CRM"}',                              '["manager","exdir","director"]',               '["manager","exdir"]',                  35),
  ('audit',             'Аудит качества',       'Без дедлайна, зависшие, просроченные',         'full', 'AuditWidget',       '{}',                                           '["gip","exdir","director"]',                   '["gip","exdir"]',                      40),
  ('portfolio_summary', 'Портфель проектов',    'Обзор всех проектов бюро',                     'full', 'PortfolioSummary',  '{}',                                           '["exdir","director"]',                         '["exdir","director"]',                 50),
  ('team_onboarding',   'Онбординг команды',    'Прогресс онбординга всех сотрудников',         'full', 'TeamOnboarding',    '{}',                                           '["exdir","admin"]',                            '["exdir"]',                            60),
  ('system_status',     'Статус системы',        'Подключения к Трекеру и БД',                   'half', 'SystemStatus',      '{}',                                           '["exdir","admin"]',                            '["exdir","admin"]',                    90),
  ('crm_analytics',    'CRM Аналитика',         'Скоринг, прогноз выручки, velocity, аномалии', 'full', 'CrmAnalytics',      '{}',                                           '["manager","exdir","director"]',               '["manager","exdir"]',                  16),
  ('crm_timeline',     'CRM — Лента',           'Последние события CRM',                        'half', 'CrmTimeline',       '{}',                                           '["manager","exdir","director"]',               '["manager","exdir"]',                  17),
  ('lead_aging',       'Застрявшие лиды',        'Лиды без обновлений',                          'half', 'LeadAging',         '{}',                                           '["manager","exdir","director"]',               '["manager","exdir"]',                  18)
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────
-- 5. ОЧЕРЕДИ ТРЕКЕРА (конфигурация)
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS queues (
  id          SERIAL PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#5BA4F5',
  icon        TEXT DEFAULT 'folder',
  statuses    JSONB DEFAULT '[]',
  transitions JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INT DEFAULT 100,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO queues (key, name, description, color, icon, sort_order, statuses, transitions) VALUES
  ('CRM', 'CRM — Продажи', 'Лиды, квалификация, КП, договоры', '#6DD8E0', 'funnel', 10,
    '[
      {"key":"newLead","display":"Новый лид","type":"initial","color":"#5BA4F5"},
      {"key":"qualification","display":"Квалификация","type":"progress","color":"#C9A0FF"},
      {"key":"proposal","display":"КП отправлено","type":"progress","color":"#FFB155"},
      {"key":"negotiation","display":"Переговоры","type":"progress","color":"#FF9F43"},
      {"key":"contract","display":"Договор","type":"progress","color":"#42C774"},
      {"key":"projectOpened","display":"Проект открыт","type":"done","color":"#2ECC71"},
      {"key":"postponed","display":"Отложен","type":"progress","color":"#7A8899"},
      {"key":"rejected","display":"Отказ","type":"done","color":"#FF7B72"}
    ]',
    '{
      "newLead":["qualification","rejected"],
      "qualification":["proposal","postponed","rejected"],
      "proposal":["negotiation","qualification","postponed","rejected"],
      "negotiation":["contract","proposal","postponed","rejected"],
      "contract":["projectOpened","negotiation","rejected"],
      "postponed":["qualification","proposal","rejected"],
      "rejected":["qualification"]
    }'
  ),
  ('PROJ', 'Проектирование', 'Производственные задачи, объекты, стадии', '#C9A0FF', 'building', 20,
    '[
      {"key":"open","display":"Открыта","type":"initial","color":"#5BA4F5"},
      {"key":"inProgress","display":"В работе","type":"progress","color":"#FFB155"},
      {"key":"review","display":"Проверка ГИПом","type":"progress","color":"#C9A0FF"},
      {"key":"needsInfo","display":"Требуется информация","type":"progress","color":"#6DD8E0"},
      {"key":"closed","display":"Закрыта","type":"done","color":"#42C774"}
    ]',
    '{}'
  ),
  ('DOCS', 'Документооборот', 'Договоры, экспертизы, согласования', '#FFB155', 'file', 30,
    '[]', '{}'
  ),
  ('HR', 'Кадры и быт', 'Командировки, отпуска, закупки', '#42C774', 'users', 40,
    '[]', '{}'
  )
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────
-- 6. ПОЛЯ ОЧЕРЕДЕЙ (кастомные)
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS queue_fields (
  id            SERIAL PRIMARY KEY,
  queue_key     TEXT NOT NULL REFERENCES queues(key) ON DELETE CASCADE,
  field_key     TEXT NOT NULL,
  label         TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'text',
  options       JSONB DEFAULT '[]',
  required      BOOLEAN DEFAULT FALSE,
  show_on_card  BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 100,
  UNIQUE(queue_key, field_key)
);

INSERT INTO queue_fields (queue_key, field_key, label, type, options, required, show_on_card, sort_order) VALUES
  ('CRM', 'leadSource',    'Источник лида',     'select', '["Сайт","Рекомендация","Тендер","Повторный клиент","Холодный звонок","Выставка","Партнёр"]', FALSE, TRUE, 10),
  ('CRM', 'objectType',    'Тип объекта',       'select', '["Жилой дом / ЖК","Школа / Детский сад","Спортивный","Коммерческий","Административное","ОКН","Благоустройство","Мастер-план","Реконструкция","Интерьер"]', FALSE, TRUE, 20),
  ('CRM', 'stage',         'Стадия',            'select', '["ЭП","П","РД","ПД","Полный цикл","Авторский надзор"]', FALSE, TRUE, 30),
  ('CRM', 'area',          'Площадь объекта',   'number', '[]', FALSE, TRUE, 40),
  ('CRM', 'budgetKP',      'Бюджет КП',         'number', '[]', FALSE, TRUE, 50),
  ('CRM', 'contractSum',   'Сумма договора',    'number', '[]', FALSE, FALSE, 60),
  ('CRM', 'contactPerson', 'Контактное лицо',   'text',   '[]', FALSE, TRUE, 70),
  ('CRM', 'rejectReason',  'Причина отказа',    'select', '["Цена","Сроки","Конкурент","Нет бюджета","Заморозка","Нецелевой","Нет ресурсов","Условия"]', FALSE, FALSE, 80)
ON CONFLICT (queue_key, field_key) DO NOTHING;


-- ─────────────────────────────────────
-- 7. РАСКЛАДКА ДАШБОРДА
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id          SERIAL PRIMARY KEY,
  user_id     INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  layout      JSONB DEFAULT '[]',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────
-- 8. ОНБОРДИНГ
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


-- ─────────────────────────────────────
-- 9. ЖУРНАЛ ДЕЙСТВИЙ (AUDIT LOG)
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


-- ─────────────────────────────────────
-- 10. УВЕДОМЛЕНИЯ (IN-APP)
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


-- ─────────────────────────────────────
-- 11. CRM СНАПШОТЫ (исторические срезы воронки)
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_snapshots (
  id              SERIAL PRIMARY KEY,
  snapshot_date   DATE NOT NULL,
  stage_key       TEXT NOT NULL,
  lead_count      INT DEFAULT 0,
  total_budget    BIGINT DEFAULT 0,
  avg_cycle_days  FLOAT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, stage_key)
);

CREATE INDEX IF NOT EXISTS idx_crm_snapshots_date ON crm_snapshots(snapshot_date);


-- ─────────────────────────────────────
-- 12. CRM СОБЫТИЯ (локальный Activity Log)
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_events (
  id          SERIAL PRIMARY KEY,
  issue_key   TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  user_id     INT REFERENCES users(id) ON DELETE SET NULL,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_events_issue ON crm_events(issue_key);
CREATE INDEX IF NOT EXISTS idx_crm_events_date ON crm_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_events_type ON crm_events(event_type);


-- ─────────────────────────────────────
-- 13. ML МОДЕЛИ (кэш обученных моделей)
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS ml_models (
  id          SERIAL PRIMARY KEY,
  model_type  TEXT NOT NULL,
  model_data  JSONB NOT NULL,
  metrics     JSONB DEFAULT '{}',
  trained_on  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_models_type ON ml_models(model_type, created_at DESC);


-- ═══════════════════════════════════════════════════════
-- СВЯЗИ
-- ═══════════════════════════════════════════════════════
--
--  users ─────┬──── user_settings     (1:1)
--             ├──── onboarding         (1:N)
--             ├──── dashboard_layouts  (1:1)
--             ├──── audit_log          (1:N)
--             ├──── notifications     (1:N)
--             └──── crm_events        (1:N)
--
--  roles      ←──── users.role
--  widgets    (standalone registry, access via allowed_roles jsonb)
--  queues     ←──── queue_fields.queue_key
--  crm_snapshots   (standalone, daily snapshots)
--  ml_models       (standalone, trained model cache)
--
-- ═══════════════════════════════════════════════════════
