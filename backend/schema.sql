-- Anvil — Postgres schema
-- ------------------------------------------------------------------
-- Run automatically on startup by src/lib/db-pg.js when DATABASE_URL
-- is set; every statement is idempotent. Mirrors the JSON store in
-- src/lib/db-json.js.

CREATE TABLE IF NOT EXISTS invites (
  id               TEXT PRIMARY KEY,
  token            TEXT UNIQUE NOT NULL,
  inviter_id       TEXT NOT NULL,
  inviter_name     TEXT NOT NULL,
  recipient_email  TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'accepted')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL,
  accepted_by_id   TEXT,
  accepted_by_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites (inviter_id);

-- One row per partnership; each user can be in up to MAX_PARTNERS rows.
CREATE TABLE IF NOT EXISTS links (
  id          TEXT PRIMARY KEY,
  user_a_id   TEXT NOT NULL,
  user_a_name TEXT,
  user_b_id   TEXT NOT NULL,
  user_b_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_links_pair ON links (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id));
CREATE INDEX IF NOT EXISTS idx_links_a ON links (user_a_id);
CREATE INDEX IF NOT EXISTS idx_links_b ON links (user_b_id);

-- The user's latest sync payload (including their sharePrefs).
-- Filtering by sharePrefs happens at read time in routes/sync.js.
CREATE TABLE IF NOT EXISTS shared_data (
  user_id    TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pending "Push <partner>" nudges; deleted once delivered.
CREATE TABLE IF NOT EXISTS pushes (
  id         TEXT PRIMARY KEY,
  from_id    TEXT NOT NULL,
  from_name  TEXT,
  to_id      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pushes_to ON pushes (to_id);
