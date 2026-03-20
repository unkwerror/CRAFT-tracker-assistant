import pg from 'pg';

const { Pool } = pg;

let pool = null;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
  });

  return pool;
}

// ── Query helper ──
export async function query(text, params = []) {
  const p = getPool();
  if (!p) throw new Error('DATABASE_URL not configured');
  const result = await p.query(text, params);
  return result;
}

// ── Check if DB is connected ──
export function isDbConnected() {
  return !!process.env.DATABASE_URL;
}

// ══════════════════════════════════════
// Users
// ══════════════════════════════════════

export async function findUserByYandexUid(yandexUid) {
  const { rows } = await query('SELECT * FROM users WHERE yandex_uid = $1', [yandexUid]);
  return rows[0] || null;
}

export async function findUserById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createUser({ yandex_uid, tracker_login, name, email, avatar_url, role = 'architect', office = 'tyumen' }) {
  const { rows } = await query(
    `INSERT INTO users (yandex_uid, tracker_login, name, email, avatar_url, role, office, last_login)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [yandex_uid, tracker_login, name, email, avatar_url, role, office]
  );
  return rows[0];
}

export async function updateUserLogin(yandexUid, { tracker_login, name, avatar_url }) {
  const { rows } = await query(
    `UPDATE users SET last_login = NOW(), tracker_login = COALESCE($2, tracker_login),
     name = COALESCE($3, name), avatar_url = COALESCE($4, avatar_url)
     WHERE yandex_uid = $1 RETURNING *`,
    [yandexUid, tracker_login, name, avatar_url]
  );
  return rows[0];
}

export async function getAllUsers() {
  const { rows } = await query('SELECT id, name, email, role, last_login, avatar_url, office FROM users ORDER BY name');
  return rows;
}

export async function updateUserRole(userId, role) {
  await query('UPDATE users SET role = $2 WHERE id = $1', [userId, role]);
}

// ══════════════════════════════════════
// Onboarding
// ══════════════════════════════════════

export async function getOnboardingProgress(userId) {
  const { rows } = await query(
    'SELECT step_id, completed, completed_at FROM onboarding WHERE user_id = $1 ORDER BY step_id',
    [userId]
  );
  return rows;
}

export async function upsertOnboardingStep(userId, stepId, completed) {
  const { rows } = await query(
    `INSERT INTO onboarding (user_id, step_id, completed, completed_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, step_id)
     DO UPDATE SET completed = $3, completed_at = $4
     RETURNING *`,
    [userId, stepId, completed, completed ? new Date().toISOString() : null]
  );
  return rows[0];
}

export async function createOnboardingSteps(userId, totalSteps = 10) {
  const values = [];
  const placeholders = [];
  for (let i = 0; i < totalSteps; i++) {
    const offset = i * 3;
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
    values.push(userId, i + 1, false);
  }
  await query(
    `INSERT INTO onboarding (user_id, step_id, completed) VALUES ${placeholders.join(', ')} ON CONFLICT DO NOTHING`,
    values
  );
}
