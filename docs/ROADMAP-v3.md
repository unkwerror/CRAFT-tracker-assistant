# CRAFT-tracker-assistant v3.0 — Дорожная карта

> Дата: 21 марта 2026
> Статус: Утверждена владельцем, в работе
> Источник: Product Vision консультация трёх агентов (Backend Core, Dashboard UX, CRM Analytics)

---

## Архитектура v3.0

```
Browser (React 18)
  app/(app)/layout.js  ← ThemeProvider + Sidebar + TaskDrawer
  ├── /dashboard       ← 5 core widgets
  ├── /tasks           ← all queues, filters, virtual list
  ├── /crm             ← kanban + list + events + mini-funnel
  ├── /analytics       ← ECharts, 5 sections, ML viz
  └── /admin           ← users, roles, widgets

Next.js API Routes
  /api/tasks/*         ← READ from local DB, WRITE-THROUGH
  /api/crm/*           ← pipeline, leads from local DB
  /api/analytics/*     ← ML + stats from local DB
  /api/sync/*          ← trigger, status
  /api/tracker/**      ← compatibility bridge (deprecated)

PostgreSQL (Render)
  issues (cache) │ issue_comments │ sync_state
  crm_snapshots  │ crm_events     │ ml_models
  users, roles, widgets, queues, queue_fields ...

Yandex Tracker API v2
  TrackerClient (11 services, OOP)

Render Cron Job
  POST /api/sync/run (every 5 min) + nightly full reconcile
```

---

## Стек v3.0

| Категория | Текущее | v3.0 | Действие |
|-----------|---------|------|----------|
| Framework | Next.js 14 | Next.js 14 | Оставить |
| Styles | Tailwind 3.4 + CSS vars | + data-theme | Расширить |
| DB | 13 таблиц | ~17 таблиц | Добавить issues, issue_comments, sync_state |
| DnD | @dnd-kit | + DragOverlay | Исправить |
| Charts | @nivo | **echarts-for-react ^3.0.2** | Заменить |
| 3D Funnel | @react-three/fiber | Оставить | — |
| Drawer | нет | **vaul** | Добавить |
| Virtual List | нет | **@tanstack/virtual ^3** | Добавить |
| Command | нет | **cmdk** (Phase 4+) | Отложить |
| ML | ml-*, simple-statistics | Оставить, убрать LogReg из UI | — |
| Background | нет | **Render Cron Job** | Добавить |

---

## Phase 0 — Quick Wins & Стабилизация (1 неделя)

| # | Задача | Агент | Размер |
|---|--------|-------|--------|
| 0.1 | DnD fix: DragOverlay + delay activation (300ms) | UX | S |
| 0.2 | StatsBar overflow-hidden fix | UX | S |
| 0.3 | Login page: убрать inline background style | UX | S |
| 0.4 | Подключить crm_events + crm_snapshots к API | Backend | S |
| 0.5 | Настроить ESLint (non-interactive) | Release Gate | S |

---

## Phase 1 — Data Sync Layer (2–3 недели)

| # | Задача | Размер |
|---|--------|--------|
| 1.1 | Таблицы issues, issue_comments, sync_state | S |
| 1.2 | lib/sync.mjs — sync engine | L |
| 1.3 | POST /api/sync/run (SYNC_SECRET) | S |
| 1.4 | Render Cron Job (5 мин) | S |
| 1.5 | GET /api/tracker/tasks → local DB | M |
| 1.6 | GET /api/tracker/queues/[key] → local DB | M |
| 1.7 | Write-through PATCH | M |
| 1.8 | Nightly full reconcile | S |
| 1.9 | Ежедневный crm_snapshot cron | S |

---

## Phase 2 — Multi-Screen + Global Theme (2 недели)

| # | Задача | Размер |
|---|--------|--------|
| 2.1 | Route group app/(app)/layout.js | M |
| 2.2 | ThemeProvider + lib/themes.mjs | M |
| 2.3 | Tailwind craft-* → var(--craft-*) | S |
| 2.4 | Sidebar: Tasks, CRM, Analytics | S |
| 2.5 | /tasks page | M |
| 2.6 | /crm page (kanban + list + events) | L |
| 2.7 | /analytics page (заглушка) | S |
| 2.8 | /admin → route group | S |
| 2.9 | Дашборд: 5 core виджетов | M |

Минимальный дашборд: StatsBar, tasks_my, funnel_crm, audit, onboarding.

---

## Phase 3 — Task Editor + Analytics (3 недели)

| # | Задача | Агент | Размер |
|---|--------|-------|--------|
| 3.1 | TaskDrawer (vaul, из LeadDetailModal) | UX | L |
| 3.2 | useTaskDrawer + ?task=CRM-42 | UX | S |
| 3.3 | API comments | Backend | S |
| 3.4 | API attachments | Backend | S |
| 3.5 | API changelog | Backend | S |
| 3.6 | ECharts + craft-dark тема | Analytics | L |
| 3.7 | Analytics: 5 секций | Analytics | L |
| 3.8 | analytics-descriptions.mjs | Analytics | S |
| 3.9 | InfoPopover компонент | UX | S |
| 3.10 | AuditWidget → scorecards + gauge | Analytics | M |

---

## Phase 4 — Widget Picker + CRM Polish (2 недели)

| # | Задача | Размер |
|---|--------|--------|
| 4.1 | Widget Picker full-screen modal | L |
| 4.2 | Style previews + size + color | M |
| 4.3 | Поиск + описания + категории | S |
| 4.4 | widget_preferences таблица | S |
| 4.5 | CRM mini-funnel header | M |
| 4.6 | "Застрявшие" как фильтр | S |
| 4.7 | @tanstack/virtual для списка | M |
| 4.8 | StatsBar accordion expand | M |

---

## Phase 5 — Admin + ML + Release (2 недели)

| # | Задача | Агент | Размер |
|---|--------|-------|--------|
| 5.1 | Роли → capability tags | UX | M |
| 5.2 | Виджеты → card grid | UX | M |
| 5.3 | Убрать LogReg из UI | Analytics | S |
| 5.4 | K-means авто-лейблинг | Analytics | S |
| 5.5 | Deal Velocity Benchmark | Analytics | S |
| 5.6 | ML кеш моделей (TTL 10 мин) | Analytics | S |
| 5.7 | Удалить @nivo из package.json | Release Gate | S |
| 5.8 | Full build + lint + smoke | Release Gate | S |

---

## Phase 6 (Будущее)

- HR/DOCS очереди (statuses, queue_fields)
- Эпики/Вехи (parent_key, рекурсивный CTE)
- Ганнт (task_relations: blocks, depends_on)
- Projects экран (EntityService)
- SSE real-time (при 10+ пользователей)
- Redis (при 50+ пользователей)

---

## Бюджет

| Компонент | План | $/мес |
|-----------|------|-------|
| Web Service | Render Starter | $7 |
| PostgreSQL | Basic 256MB | $7 |
| Cron Job | Starter | $1 |
| **Итого** | | **$15** |

---

## Timeline

```
Неделя 1:     Phase 0
Недели 2–4:   Phase 1 (Data Sync)
Недели 5–6:   Phase 2 (Multi-Screen)
Недели 7–9:   Phase 3 (Task Editor + Analytics)
Недели 10–11: Phase 4 (Widget Picker)
Недели 12–13: Phase 5 (Admin + ML + Release)
```
