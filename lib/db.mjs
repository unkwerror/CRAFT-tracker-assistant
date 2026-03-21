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


// ══════════════════════════════════════
// CRM Snapshots
// ══════════════════════════════════════

export async function insertSnapshot(date, stageKey, count, budget, avgCycle = null) {
  await query(
    `INSERT INTO crm_snapshots (snapshot_date, stage_key, lead_count, total_budget, avg_cycle_days)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (snapshot_date, stage_key)
     DO UPDATE SET lead_count = $3, total_budget = $4, avg_cycle_days = $5`,
    [date, stageKey, count, budget, avgCycle]
  );
}

export async function getSnapshots(from, to) {
  const { rows } = await query(
    `SELECT snapshot_date, stage_key, lead_count, total_budget, avg_cycle_days
     FROM crm_snapshots
     WHERE snapshot_date >= $1 AND snapshot_date <= $2
     ORDER BY snapshot_date, stage_key`,
    [from, to]
  );
  return rows;
}


// ══════════════════════════════════════
// CRM Events
// ══════════════════════════════════════

export async function insertCrmEvent(issueKey, eventType, userId, details = {}) {
  const { rows } = await query(
    `INSERT INTO crm_events (issue_key, event_type, user_id, details)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [issueKey, eventType, userId, JSON.stringify(details)]
  );
  return rows[0];
}

export async function getCrmEvents({ issueKey, from, to, eventType, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (issueKey) { conditions.push(`issue_key = $${idx++}`); params.push(issueKey); }
  if (eventType) { conditions.push(`event_type = $${idx++}`); params.push(eventType); }
  if (from) { conditions.push(`created_at >= $${idx++}`); params.push(from); }
  if (to) { conditions.push(`created_at <= $${idx++}`); params.push(to); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT ce.*, u.name as user_name
     FROM crm_events ce
     LEFT JOIN users u ON u.id = ce.user_id
     ${where}
     ORDER BY ce.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return rows;
}


// ══════════════════════════════════════
// ML Models Cache
// ══════════════════════════════════════

export async function saveModel(modelType, modelData, metrics = {}, trainedOn = 0) {
  const { rows } = await query(
    `INSERT INTO ml_models (model_type, model_data, metrics, trained_on)
     VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
    [modelType, JSON.stringify(modelData), JSON.stringify(metrics), trainedOn]
  );
  return rows[0];
}

export async function getLatestModel(modelType) {
  const { rows } = await query(
    `SELECT * FROM ml_models WHERE model_type = $1 ORDER BY created_at DESC LIMIT 1`,
    [modelType]
  );
  return rows[0] || null;
}

// ══════════════════════════════════════
// Sync Layer: local issues cache
// ══════════════════════════════════════

function asJson(value, fallback) {
  if (value == null) return JSON.stringify(fallback);
  return JSON.stringify(value);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function dbRowToNormalizedIssue(row) {
  return {
    key: row.key,
    summary: row.summary,
    description: row.description,
    status: row.status_display,
    statusKey: row.status_key,
    priority: null,
    priorityKey: row.priority_key,
    type: row.type_display,
    typeKey: row.type_key,
    deadline: row.deadline,
    assignee: row.assignee_display,
    assigneeId: row.assignee_id,
    queue: row.queue_key,
    components: asArray(row.components),
    tags: asArray(row.tags),
    createdAt: row.tracker_created_at,
    updatedAt: row.tracker_updated_at,
    resolvedAt: null,
    createdBy: row.created_by,
    sprint: asArray(row.sprint),
    storyPoints: row.story_points,
    estimation: null,
    customFields: asObject(row.custom_fields),
    transitions: [],
    url: `https://tracker.yandex.ru/${row.key}`,
  };
}

export async function upsertIssue(issue) {
  if (!issue?.key) throw new Error('Issue key is required for upsertIssue');

  const trackerId = issue.key;
  const queueKey = issue.queue || 'UNKNOWN';
  const storyPoints = issue.storyPoints == null ? null : Number(issue.storyPoints);

  const { rows } = await query(
    `INSERT INTO issues (
      tracker_id, key, queue_key, summary, description,
      status_key, status_display, priority_key, type_key, type_display,
      assignee_id, assignee_display, created_by, deadline, story_points,
      parent_key, sprint, custom_fields, tags, components,
      tracker_created_at, tracker_updated_at, synced_at, is_dirty, local_version, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17::jsonb, $18::jsonb, $19::jsonb, $20::jsonb,
      $21, $22, NOW(), FALSE, 1, NOW()
    )
    ON CONFLICT (key) DO UPDATE SET
      tracker_id = EXCLUDED.tracker_id,
      queue_key = EXCLUDED.queue_key,
      summary = EXCLUDED.summary,
      description = EXCLUDED.description,
      status_key = EXCLUDED.status_key,
      status_display = EXCLUDED.status_display,
      priority_key = EXCLUDED.priority_key,
      type_key = EXCLUDED.type_key,
      type_display = EXCLUDED.type_display,
      assignee_id = EXCLUDED.assignee_id,
      assignee_display = EXCLUDED.assignee_display,
      created_by = EXCLUDED.created_by,
      deadline = EXCLUDED.deadline,
      story_points = EXCLUDED.story_points,
      parent_key = EXCLUDED.parent_key,
      sprint = EXCLUDED.sprint,
      custom_fields = EXCLUDED.custom_fields,
      tags = EXCLUDED.tags,
      components = EXCLUDED.components,
      tracker_created_at = EXCLUDED.tracker_created_at,
      tracker_updated_at = EXCLUDED.tracker_updated_at,
      synced_at = NOW(),
      is_dirty = FALSE,
      updated_at = NOW()
    WHERE issues.is_dirty = FALSE
    RETURNING *`,
    [
      trackerId,
      issue.key,
      queueKey,
      issue.summary || '',
      issue.description ?? null,
      issue.statusKey ?? null,
      issue.status ?? null,
      issue.priorityKey ?? null,
      issue.typeKey ?? null,
      issue.type ?? null,
      issue.assigneeId ?? null,
      issue.assignee ?? null,
      issue.createdBy ?? null,
      issue.deadline ?? null,
      Number.isFinite(storyPoints) ? storyPoints : null,
      null, // parent_key will be added from tracker relations later
      asJson(issue.sprint, []),
      asJson(issue.customFields, {}),
      asJson(issue.tags, []),
      asJson(issue.components, []),
      issue.createdAt ?? null,
      issue.updatedAt ?? null,
    ]
  );

  return rows[0] || null;
}

export async function upsertManyIssues(issues) {
  const items = Array.isArray(issues) ? issues : [];
  if (items.length === 0) return [];

  const concurrency = Math.min(5, items.length);
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await upsertIssue(items[idx]);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results.filter(Boolean);
}

export async function getLocalIssues({ queueKey, assigneeId, statusKey, limit = 100, offset = 0 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (queueKey) {
    conditions.push(`queue_key = $${idx++}`);
    params.push(queueKey);
  }
  if (assigneeId) {
    conditions.push(`assignee_id = $${idx++}`);
    params.push(assigneeId);
  }
  if (statusKey) {
    conditions.push(`status_key = $${idx++}`);
    params.push(statusKey);
  }

  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : 100;
  const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT *
     FROM issues
     ${where}
     ORDER BY tracker_updated_at DESC NULLS LAST
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, safeLimit, safeOffset]
  );

  return rows;
}

export async function getLocalIssueByKey(key) {
  const { rows } = await query('SELECT * FROM issues WHERE key = $1 LIMIT 1', [key]);
  return rows[0] || null;
}

export async function getLocalIssuesByQueue(queueKey) {
  const { rows } = await query(
    `SELECT *
     FROM issues
     WHERE queue_key = $1
     ORDER BY tracker_updated_at DESC NULLS LAST`,
    [queueKey]
  );
  return rows;
}

export async function markIssueDirty(key, dirtyFields = []) {
  void dirtyFields; // reserved for future extension (dirty field-level sync)
  const { rows } = await query(
    `UPDATE issues
     SET is_dirty = TRUE, updated_at = NOW()
     WHERE key = $1
     RETURNING *`,
    [key]
  );
  return rows[0] || null;
}

export async function markIssueClean(key) {
  const { rows } = await query(
    `UPDATE issues
     SET is_dirty = FALSE, synced_at = NOW(), updated_at = NOW()
     WHERE key = $1
     RETURNING *`,
    [key]
  );
  return rows[0] || null;
}

export async function updateSyncState(queueKey, payload = {}) {
  const {
    status,
    lastSyncAt,
    issuesSynced,
    errorMessage,
    lastFullSync,
  } = payload;

  await query(
    `INSERT INTO sync_state (queue_key, status)
     VALUES ($1, 'idle')
     ON CONFLICT (queue_key) DO NOTHING`,
    [queueKey]
  );

  const updates = ['updated_at = NOW()'];
  const params = [queueKey];
  let idx = 2;

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    updates.push(`status = $${idx++}`);
    params.push(status);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'lastSyncAt')) {
    updates.push(`last_sync_at = $${idx++}`);
    params.push(lastSyncAt);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'issuesSynced')) {
    updates.push(`issues_synced = $${idx++}`);
    params.push(issuesSynced);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'errorMessage')) {
    updates.push(`error_message = $${idx++}`);
    params.push(errorMessage);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'lastFullSync')) {
    updates.push(`last_full_sync = $${idx++}`);
    params.push(lastFullSync);
  }

  const { rows } = await query(
    `UPDATE sync_state
     SET ${updates.join(', ')}
     WHERE queue_key = $1
     RETURNING *`,
    params
  );

  return rows[0] || null;
}

export async function getSyncState() {
  const { rows } = await query('SELECT * FROM sync_state ORDER BY queue_key');
  return rows;
}

export async function upsertIssueComment(issueKey, comment) {
  if (!issueKey) throw new Error('issueKey is required for upsertIssueComment');

  const trackerId = comment?.id ?? comment?.tracker_id ?? null;
  const authorDisplay = comment?.createdBy?.display ?? comment?.author_display ?? null;
  const text = comment?.text ?? '';
  const createdAt = comment?.createdAt ?? comment?.created_at ?? null;
  const updatedAt = comment?.updatedAt ?? comment?.updated_at ?? createdAt;

  const { rows } = await query(
    `INSERT INTO issue_comments (
      issue_key, tracker_id, author_display, text, created_at, updated_at, synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (tracker_id) DO UPDATE SET
      issue_key = EXCLUDED.issue_key,
      author_display = EXCLUDED.author_display,
      text = EXCLUDED.text,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at,
      synced_at = NOW()
    RETURNING *`,
    [issueKey, trackerId, authorDisplay, text, createdAt, updatedAt]
  );

  return rows[0] || null;
}

export async function upsertManyIssueComments(issueKey, comments) {
  const items = Array.isArray(comments) ? comments : [];
  if (!issueKey || items.length === 0) return [];

  const concurrency = Math.min(5, items.length);
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await upsertIssueComment(issueKey, items[idx]);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results.filter(Boolean);
}

export async function getIssueComments(issueKey) {
  const { rows } = await query(
    `SELECT *
     FROM issue_comments
     WHERE issue_key = $1
     ORDER BY created_at DESC NULLS LAST, id DESC`,
    [issueKey]
  );
  return rows;
}
