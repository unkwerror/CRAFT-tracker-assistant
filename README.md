# Крафт Ассистент

Персональный помощник для сотрудников архитектурного бюро Крафт Групп.  
Авторизация через Яндекс, живые данные из Трекера, трек онбординга.

## Что внутри

```
craft-assistant/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── callback/route.js   ← OAuth: Яндекс перенаправляет сюда
│   │   │   ├── me/route.js         ← GET: текущий пользователь + роль
│   │   │   └── logout/route.js     ← GET: выход
│   │   ├── tracker/
│   │   │   └── tasks/route.js      ← GET: задачи из Трекера (прокси)
│   │   └── onboarding/route.js     ← GET/PATCH: прогресс онбординга
│   ├── dashboard/                   ← Страница дашборда (TODO: фронтенд)
│   ├── login/                       ← Страница входа (TODO: фронтенд)
│   └── guide/                       ← Встроенный гайд (TODO: фронтенд)
├── lib/
│   ├── config.mjs      ← Конфиг: роли, шаги онбординга, Supabase-клиент
│   ├── tracker.mjs     ← Клиент API Трекера (все методы)
│   ├── session.mjs     ← JWT-сессии в httpOnly cookie
│   └── db-setup.mjs    ← SQL для создания таблиц
├── .env.example         ← Шаблон переменных окружения
├── package.json
├── next.config.js
├── tailwind.config.js
└── README.md
```

## Быстрый старт

### 1. Клонировать и установить

```bash
git clone https://github.com/ВАШ_ЮЗЕРНЕЙМ/craft-assistant.git
cd craft-assistant
npm install
```

### 2. Создать OAuth-приложение Яндекс

1. Перейдите на [oauth.yandex.ru](https://oauth.yandex.ru/)
2. Нажмите **Создать** → **Для доступа к API или отладки**
3. Название: `Крафт Ассистент`
4. Добавьте разрешения:
   - `tracker:read` — Чтение из трекера
   - `tracker:write` — Запись в трекер
5. Redirect URI: `http://localhost:3000/api/auth/callback`
6. Сохраните **Client ID** и **Client Secret**

### 3. Создать Supabase проект (бесплатно)

1. Зайдите на [supabase.com/dashboard](https://supabase.com/dashboard)
2. New Project → выберите регион, задайте пароль
3. Скопируйте **URL** и **anon key** (и **service_role key** из Settings → API)
4. Откройте **SQL Editor** и выполните SQL:

```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  yandex_uid    TEXT UNIQUE NOT NULL,
  tracker_login TEXT,
  name          TEXT NOT NULL,
  email         TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'architect',
  office        TEXT DEFAULT 'tyumen',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS onboarding (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id) ON DELETE CASCADE,
  step_id       INT NOT NULL,
  completed     BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  UNIQUE(user_id, step_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding(user_id);
```

### 4. Настроить переменные окружения

```bash
cp .env.example .env.local
```

Заполните `.env.local` своими значениями.

### 5. Запустить

```bash
npm run dev
```

Приложение доступно на `http://localhost:3000`

## Деплой на Vercel (бесплатно)

1. Запушьте проект на GitHub
2. Зайдите на [vercel.com](https://vercel.com) → New Project → Import из GitHub
3. Добавьте переменные окружения (Settings → Environment Variables)
4. **Важно:** измените `YANDEX_REDIRECT_URI` на `https://ваш-домен.vercel.app/api/auth/callback`
5. Обновите redirect URI в OAuth-приложении на Яндексе

## API-эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/auth/callback?code=xxx` | OAuth callback (Яндекс перенаправляет сюда) |
| GET | `/api/auth/me` | Текущий пользователь + роль |
| GET | `/api/auth/logout` | Выход |
| GET | `/api/tracker/tasks` | Мои задачи из Трекера |
| GET | `/api/tracker/tasks?queue=PROJ` | Задачи конкретной очереди |
| GET | `/api/tracker/tasks?type=overdue` | Просроченные задачи |
| GET | `/api/tracker/tasks?type=stale` | Задачи «В работе» >14 дней |
| GET | `/api/tracker/tasks?type=no_deadline` | Задачи без дедлайна |
| GET | `/api/onboarding` | Прогресс онбординга |
| PATCH | `/api/onboarding` | Отметить шаг `{ step_id: 1, completed: true }` |

## Как начать OAuth-флоу

Перенаправьте пользователя на:

```
https://oauth.yandex.ru/authorize?response_type=code&client_id=ВАШ_CLIENT_ID&redirect_uri=http://localhost:3000/api/auth/callback
```

После авторизации Яндекс перенаправит на `/api/auth/callback` с `?code=xxx`, бэкенд обменяет code на токен, создаст сессию и редиректнет на `/dashboard`.

## Маппинг ролей

После первого входа сотрудник получает роль `architect`. Администратор меняет роль в Supabase:

```sql
UPDATE users SET role = 'gip' WHERE email = 'ivanova@craft72.ru';
UPDATE users SET role = 'manager' WHERE email = 'dmitriev@craft72.ru';
UPDATE users SET role = 'exdir' WHERE email = 'savrina@craft72.ru';
UPDATE users SET role = 'director' WHERE email = 'grishanova@craft72.ru';
```

Доступные роли: `director`, `exdir`, `gip`, `architect`, `manager`, `admin`

## Стоимость

| Компонент | Стоимость |
|-----------|-----------|
| Vercel (хостинг) | Бесплатно |
| Supabase (БД) | Бесплатно (500MB) |
| Yandex OAuth | Бесплатно |
| Yandex Tracker API | Бесплатно |
| **Итого** | **$0/мес** |

## Что дальше (TODO)

- [ ] Фронтенд: страница входа (`/login`)
- [ ] Фронтенд: персональный дашборд (`/dashboard`)
- [ ] Фронтенд: интерактивный онбординг
- [ ] Фронтенд: встроенный гайд (`/guide`)
- [ ] Аудит качества (автопроверки задач)
- [ ] Дашборд руководителя (прогресс онбординга команды)
- [ ] AI-ассистент (опционально, Claude API / YandexGPT)
