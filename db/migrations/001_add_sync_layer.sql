-- ═══════════════════════════════════════════════════════
-- Migration 001: Data Sync Layer
-- Дата: 2026-03-21
-- Безопасно запускать повторно (IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS issues (
  id              SERIAL PRIMARY KEY,
  tracker_id      TEXT UNIQUE NOT NULL,
  key             TEXT UNIQUE NOT NULL,
  queue_key       TEXT NOT NULL,
  summary         TEXT NOT NULL,
  description     TEXT,
  status_key      TEXT,
  status_display  TEXT,
  priority_key    TEXT,
  type_key        TEXT,
  type_display    TEXT,
  assignee_id     TEXT,
  assignee_display TEXT,
  created_by      TEXT,
  deadline        DATE,
  story_points    FLOAT,
  parent_key      TEXT,
  sprint          JSONB DEFAULT '[]',
  custom_fields   JSONB DEFAULT '{}',
  tags            JSONB DEFAULT '[]',
  components      JSONB DEFAULT '[]',
  tracker_created_at TIMESTAMPTZ,
  tracker_updated_at TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  is_dirty        BOOLEAN DEFAULT FALSE,
  local_version   INT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_key ON issues(key);
CREATE INDEX IF NOT EXISTS idx_issues_queue ON issues(queue_key);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status_key);
CREATE INDEX IF NOT EXISTS idx_issues_assignee ON issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_updated ON issues(tracker_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_dirty ON issues(is_dirty) WHERE is_dirty = TRUE;
CREATE INDEX IF NOT EXISTS idx_issues_parent ON issues(parent_key) WHERE parent_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issues_custom ON issues USING GIN(custom_fields);

CREATE TABLE IF NOT EXISTS issue_comments (
  id              SERIAL PRIMARY KEY,
  issue_key       TEXT NOT NULL,
  tracker_id      TEXT UNIQUE,
  author_display  TEXT,
  text            TEXT NOT NULL,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_key ON issue_comments(issue_key);

CREATE TABLE IF NOT EXISTS sync_state (
  id              SERIAL PRIMARY KEY,
  queue_key       TEXT NOT NULL UNIQUE,
  last_sync_at    TIMESTAMPTZ,
  last_full_sync  TIMESTAMPTZ,
  issues_synced   INT DEFAULT 0,
  status          TEXT DEFAULT 'idle',
  error_message   TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sync_state (queue_key, status) VALUES
  ('CRM', 'idle'), ('PROJ', 'idle'), ('DOCS', 'idle'), ('HR', 'idle')
ON CONFLICT (queue_key) DO NOTHING;
