-- Migration 002: per-user widget preference storage
-- Safe to run multiple times (IF NOT EXISTS / ON CONFLICT)

CREATE TABLE IF NOT EXISTS widget_preferences (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  widget_key  TEXT NOT NULL,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, widget_key)
);

CREATE INDEX IF NOT EXISTS idx_widget_prefs_user ON widget_preferences(user_id);
