-- ============================================================
--  database/schema.sql
--  Reference schema — auto-applied by config/database.php
--  on the very first request (no manual setup needed).
--  Run this manually only if you need to reset the database:
--    sqlite3 database/stratos.sqlite < database/schema.sql
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    unit_pref     TEXT    NOT NULL DEFAULT 'metric',   -- 'metric' | 'imperial'
    theme_pref    TEXT    NOT NULL DEFAULT 'dark',     -- 'dark'   | 'light'
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Saved / favourite locations ────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_locations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    city       TEXT    NOT NULL,
    country    TEXT    NOT NULL DEFAULT '',
    lat        REAL    NOT NULL,
    lon        REAL    NOT NULL,
    label      TEXT    NOT NULL DEFAULT '',
    added_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, lat, lon)
);

-- ── Weather alerts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weather_alerts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    city         TEXT    NOT NULL,
    lat          REAL    NOT NULL,
    lon          REAL    NOT NULL,
    metric       TEXT    NOT NULL,   -- 'temp' | 'humidity' | 'wind_speed' | 'condition'
    operator     TEXT    NOT NULL,   -- 'gt' | 'lt' | 'eq'
    threshold    REAL,               -- numeric threshold (NULL for condition alerts)
    cond_value   TEXT,               -- e.g. 'Rain', 'Clear' (NULL for numeric alerts)
    is_active    INTEGER NOT NULL DEFAULT 1,
    last_checked TEXT,
    triggered_at TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Search / lookup history ────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL = guest
    city        TEXT    NOT NULL,
    country     TEXT    NOT NULL DEFAULT '',
    lat         REAL,
    lon         REAL,
    temp        REAL,
    feels_like  REAL,
    humidity    INTEGER,
    wind_speed  REAL,
    condition   TEXT,
    icon        TEXT,
    searched_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hist_user   ON search_history(user_id, searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON weather_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_locs_user   ON saved_locations(user_id);
