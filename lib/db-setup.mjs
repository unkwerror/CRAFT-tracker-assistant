/*
 * npm run db:setup
 * Показывает SQL для создания таблиц в Supabase
 */

const SQL = `
-- ═══ Пользователи ═══
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

-- ═══ Прогресс онбординга ═══
CREATE TABLE IF NOT EXISTS onboarding (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id) ON DELETE CASCADE,
  step_id       INT NOT NULL,
  completed     BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  UNIQUE(user_id, step_id)
);

-- ═══ Индексы ═══
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding(user_id);
`;

console.log('');
console.log('════════════════════════════════════════');
console.log(' Крафт Ассистент — SQL для Supabase');
console.log('════════════════════════════════════════');
console.log('');
console.log('Скопируйте и выполните в Supabase Dashboard → SQL Editor:');
console.log(SQL);
