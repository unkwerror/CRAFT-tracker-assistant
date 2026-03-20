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
  const { rows } = await query(
    'SELECT id, name, email, role, last_login, avatar_url, office, is_active FROM users ORDER BY name'
  );
  return rows;
}

export async function updateUserRole(userId, role) {
  await query('UPDATE users SET role = $2 WHERE id = $1', [userId, role]);
}

export async function deactivateUser(userId) {
  await query('UPDATE users SET is_active = FALSE WHERE id = $1', [userId]);
}

export async function activateUser(userId) {
  await query('UPDATE users SET is_active = TRUE WHERE id = $1', [userId]);
}


// ══════════════════════════════════════
// Roles (from DB)
// ══════════════════════════════════════

export async function getAllRoles() {
  const { rows } = await query('SELECT * FROM roles ORDER BY level DESC, key');
  return rows;
}

export async function getRoleByKey(key) {
  const { rows } = await query('SELECT * FROM roles WHERE key = $1', [key]);
  return rows[0] || null;
}

export async function createRole({ key, label, color = '#7A8899', level = 1, queues = [], permissions = [] }) {
  const { rows } = await query(
    `INSERT INTO roles (key, label, color, level, queues, permissions)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [key, label, color, level, JSON.stringify(queues), JSON.stringify(permissions)]
  );
  return rows[0];
}

export async function updateRole(key, { label, color, level, queues, permissions }) {
  const { rows } = await query(
    `UPDATE roles SET 
       label = COALESCE($2, label),
       color = COALESCE($3, color),
       level = COALESCE($4, level),
       queues = COALESCE($5, queues),
       permissions = COALESCE($6, permissions)
     WHERE key = $1 RETURNING *`,
    [key, label, color, level,
     queues ? JSON.stringify(queues) : null,
     permissions ? JSON.stringify(permissions) : null]
  );
  return rows[0];
}

export async function deleteRole(key) {
  // Prevent deleting system roles
  const role = await getRoleByKey(key);
  if (role?.is_system) throw new Error('Cannot delete system role');
  
  // Check no users have this role
  const { rows } = await query('SELECT COUNT(*) as count FROM users WHERE role = $1', [key]);
  if (parseInt(rows[0].count) > 0) throw new Error('Role is assigned to users');
  
  await query('DELETE FROM roles WHERE key = $1 AND is_system = FALSE', [key]);
}


// ══════════════════════════════════════
// Widgets (registry from DB)
// ══════════════════════════════════════

export async function getAllWidgets() {
  const { rows } = await query(
    'SELECT * FROM widgets WHERE is_active = TRUE ORDER BY sort_order, key'
  );
  return rows;
}

export async function getWidgetByKey(key) {
  const { rows } = await query('SELECT * FROM widgets WHERE key = $1', [key]);
  return rows[0] || null;
}

// Get widgets available for a specific role
export async function getWidgetsForRole(roleKey) {
  const { rows } = await query(
    `SELECT * FROM widgets 
     WHERE is_active = TRUE 
       AND (allowed_roles @> '["*"]'::jsonb OR allowed_roles @> $1::jsonb)
     ORDER BY sort_order`,
    [JSON.stringify([roleKey])]
  );
  return rows;
}

// Get default widget keys for a role (for first login)
export async function getDefaultWidgetsForRole(roleKey) {
  const { rows } = await query(
    `SELECT key FROM widgets 
     WHERE is_active = TRUE 
       AND (default_for @> '["*"]'::jsonb OR default_for @> $1::jsonb)
     ORDER BY sort_order`,
    [JSON.stringify([roleKey])]
  );
  return rows.map(r => r.key);
}


// ══════════════════════════════════════
// Dashboard Layouts
// ══════════════════════════════════════

export async function getDashboardLayout(userId) {
  const { rows } = await query(
    'SELECT layout FROM dashboard_layouts WHERE user_id = $1',
    [userId]
  );
  if (rows[0]?.layout) return rows[0].layout;
  return [];
}

export async function saveDashboardLayout(userId, layout) {
  const { rows } = await query(
    `INSERT INTO dashboard_layouts (user_id, layout, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET layout = $2, updated_at = NOW()
     RETURNING *`,
    [userId, JSON.stringify(layout)]
  );
  return rows[0];
}


// ══════════════════════════════════════
// Audit Log
// ══════════════════════════════════════

export async function logAction(userId, action, entityType, entityId, oldValue = null, newValue = null) {
  await query(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId, action, entityType, entityId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
    ]
  );
}

export async function getAuditLog(limit = 50, offset = 0) {
  const { rows } = await query(
    `SELECT al.*, u.name as user_name
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
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


// ══════════════════════════════════════
// User Settings
// ══════════════════════════════════════

export async function getUserSettings(userId) {
  const { rows } = await query(
    'SELECT * FROM user_settings WHERE user_id = $1',
    [userId]
  );
  return rows[0] || null;
}

export async function upsertUserSettings(userId, settings) {
  const { theme, sidebar_open, notify_email, notify_push, notify_telegram, telegram_chat_id, locale } = settings;
  const { rows } = await query(
    `INSERT INTO user_settings (user_id, theme, sidebar_open, notify_email, notify_push, notify_telegram, telegram_chat_id, locale, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       theme = COALESCE($2, user_settings.theme),
       sidebar_open = COALESCE($3, user_settings.sidebar_open),
       notify_email = COALESCE($4, user_settings.notify_email),
       notify_push = COALESCE($5, user_settings.notify_push),
       notify_telegram = COALESCE($6, user_settings.notify_telegram),
       telegram_chat_id = COALESCE($7, user_settings.telegram_chat_id),
       locale = COALESCE($8, user_settings.locale),
       updated_at = NOW()
     RETURNING *`,
    [userId, theme, sidebar_open, notify_email, notify_push, notify_telegram, telegram_chat_id, locale]
  );
  return rows[0];
}

// ══════════════════════════════════════
// Queues (v4)
// ══════════════════════════════════════

export async function getAllQueues() {
  try {
    const { rows } = await query(
      'SELECT * FROM queues WHERE is_active = TRUE ORDER BY sort_order, key'
    );
    return rows;
  } catch (e) {
    return [];
  }
}

export async function getQueueByKey(key) {
  try {
    const { rows } = await query('SELECT * FROM queues WHERE key = $1', [key]);
    return rows[0] || null;
  } catch (e) {
    return null;
  }
}

export async function getQueueFields(queueKey) {
  try {
    const { rows } = await query(
      'SELECT * FROM queue_fields WHERE queue_key = $1 ORDER BY sort_order, field_key',
      [queueKey]
    );
    return rows;
  } catch (e) {
    return [];
  }
}

export async function getQueueWithFields(queueKey) {
  try {
    const queue = await getQueueByKey(queueKey);
    if (!queue) return null;
    const fields = await getQueueFields(queueKey);
    return { ...queue, fields };
  } catch (e) {
    return null;
  }
}
