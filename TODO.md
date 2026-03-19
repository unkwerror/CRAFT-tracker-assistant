# TODO — Крафт Ассистент

## Текущий статус: Заготовка бэкенда готова ✅

Работает:
- [x] Структура Next.js проекта
- [x] Yandex OAuth (callback, session, logout)
- [x] JWT-сессии в httpOnly cookie
- [x] API прокси к Трекеру (задачи, фильтры, аудит)
- [x] API онбординга (GET/PATCH прогресс)
- [x] Конфиг ролей и шагов онбординга
- [x] Страница входа (заглушка)
- [x] Страница дашборда (заглушка)
- [x] Graceful degradation: работает без Supabase и без TRACKER_ORG_ID

---

## Этап 1 — Запуск (сейчас)

### 1.1 Настроить окружение
- [ ] Создать OAuth-приложение: https://oauth.yandex.ru/
  - Тип: «Для доступа к API или отладки»
  - Разрешения: `tracker:read`, `tracker:write`
  - Redirect URI: `http://localhost:3000/api/auth/callback`
  - Записать Client ID и Client Secret
- [ ] Заполнить `.env.local`:
  ```
  YANDEX_CLIENT_ID=xxx
  YANDEX_CLIENT_SECRET=xxx
  NEXT_PUBLIC_YANDEX_CLIENT_ID=xxx   # тот же ID, для кнопки на фронте
  SESSION_SECRET=случайная_строка_32_символа
  ```
- [ ] `npm install && npm run dev`
- [ ] Проверить: зайти на localhost:3000 → кнопка «Войти через Яндекс» → после входа видим /dashboard

### 1.2 Подключить Supabase (когда готовы)
- [ ] Создать проект: https://supabase.com/dashboard → New Project
- [ ] `npm run db:setup` → скопировать SQL → выполнить в Supabase SQL Editor
- [ ] Вписать в `.env.local`:
  ```
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_KEY=xxx
  ```
- [ ] Перезапустить `npm run dev`
- [ ] Проверить: после входа пользователь создаётся в таблице `users`

### 1.3 Подключить Трекер (когда получите ORG_ID)
- [ ] Получить от администратора: Трекер → Администрирование → Организации → ID
- [ ] Вписать `TRACKER_ORG_ID=xxx` в `.env.local`
- [ ] Проверить: GET http://localhost:3000/api/tracker/tasks → видим задачи

---

## Этап 2 — Фронтенд дашборда

### 2.1 Дашборд
- [ ] Виджет «Мои задачи» — список из /api/tracker/tasks
- [ ] Виджет «Просроченные» — /api/tracker/tasks?type=overdue
- [ ] Виджет «Без дедлайна» — /api/tracker/tasks?type=no_deadline
- [ ] Виджет «Зависшие» — /api/tracker/tasks?type=stale
- [ ] Карточка роли с цветом и списком очередей
- [ ] Быстрые ссылки на Трекер (мои задачи, доска, Ганта)
- [ ] Адаптивность (мобильная версия для ГИПов на выезде)

### 2.2 Онбординг
- [ ] Интерактивный чеклист из 10 шагов
- [ ] Отметка шага → PATCH /api/onboarding
- [ ] Прогресс-бар
- [ ] Ссылка на соответствующий раздел гайда для каждого шага
- [ ] Ссылка на Трекер для практических шагов

### 2.3 Встроенный гайд
- [ ] Интегрировать HTML-шпаргалку в /guide
- [ ] Или: iframe / переход на GitHub Pages версию

---

## Этап 3 — Расширения (после получения ORG_ID)

### 3.1 Аудит качества
- [ ] Cron-задача: раз в час опросить Трекер по каждому пользователю
- [ ] Генерировать рекомендации: нет дедлайна, не внесены часы, зависшие задачи
- [ ] Сохранять в таблицу audit_results
- [ ] Показывать на дашборде: «У вас 3 задачи без дедлайна»

### 3.2 Дашборд руководителя
- [ ] Прогресс онбординга всей команды
- [ ] Сводка по просрочкам всех сотрудников
- [ ] Статистика CRM-воронки (для директора)

### 3.3 Маппинг ролей через UI
- [ ] Страница /admin для exdir
- [ ] Список сотрудников из таблицы users
- [ ] Изменение роли через интерфейс (вместо SQL)

---

## Этап 4 — Продвинутые фичи (месяц 2+)

- [ ] AI-ассистент (Claude API / YandexGPT)
- [ ] Telegram-уведомления
- [ ] DataLens-графики на дашборде
- [ ] PWA (установка на телефон)

---

## Деплой

### Vercel (бесплатно)
1. Запушить на GitHub
2. vercel.com → New Project → Import
3. Добавить все переменные из .env.local в Settings → Environment Variables
4. Обновить redirect URI в OAuth-приложении на продакшен-домен

### Кастомный домен
- Добавить CNAME: `assistant.craft72.ru` → `cname.vercel-dns.com`
- Vercel → Settings → Domains → добавить `assistant.craft72.ru`
