-- Day84 — Production Database Schema (Postgres)
-- ------------------------------------------------------------------
-- The running backend in this project (src/lib/db.js) uses a JSON
-- file so the whole thing works with zero setup. This file is the
-- schema you'd actually run in production — point src/lib/db.js's
-- exports at real queries against this schema (or use an ORM like
-- Prisma/Drizzle) before shipping. The shape matches db.js's data
-- model exactly so the swap is mechanical, not a redesign.

CREATE TABLE invites (
  id            TEXT PRIMARY KEY,
  token         TEXT UNIQUE NOT NULL,
  inviter_id    TEXT NOT NULL,
  inviter_name  TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'accepted')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_invites_token ON invites (token);

CREATE TABLE links (
  id          TEXT PRIMARY KEY,
  user_a_id   TEXT NOT NULL,
  user_b_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a_id),
  UNIQUE (user_b_id)
);

-- One row per user holding the data they've opted to sync, plus
-- their own sharing preferences. Filtering by sharePrefs happens in
-- application code at read time (see routes/sync.js) — never trust
-- a client to have already filtered this for you.
CREATE TABLE shared_data (
  user_id           TEXT PRIMARY KEY,
  share_streaks     BOOLEAN NOT NULL DEFAULT true,
  share_cycle_progress BOOLEAN NOT NULL DEFAULT true,
  share_goal_text   BOOLEAN NOT NULL DEFAULT false,
  share_vision_text BOOLEAN NOT NULL DEFAULT false,
  streaks           INTEGER,
  cycle_progress    NUMERIC(5,2),
  goal_text         TEXT,
  vision_text       TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recommended: enable encryption at rest at the database/volume
-- level (most managed Postgres providers — RDS, Supabase, Neon,
-- Cloud SQL — do this by default; just confirm it's on).
