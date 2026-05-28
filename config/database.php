<?php
// ============================================================
//  config/database.php — SQLite PDO singleton + auto-schema
// ============================================================

require_once __DIR__ . '/config.php';

class DB {
    private static ?PDO $instance = null;

    public static function get(): PDO {
        if (self::$instance === null) {
            $dir = dirname(DB_PATH);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            self::$instance = new PDO('sqlite:' . DB_PATH, options: [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            self::$instance->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
            self::migrate(self::$instance);
        }
        return self::$instance;
    }

    // ── Auto-apply schema on first run ────────────────────────
    private static function migrate(PDO $db): void {
        $db->exec("
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                username      TEXT    NOT NULL UNIQUE,
                email         TEXT    NOT NULL UNIQUE,
                password_hash TEXT    NOT NULL,
                unit_pref     TEXT    NOT NULL DEFAULT 'metric',
                theme_pref    TEXT    NOT NULL DEFAULT 'dark',
                created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
            );

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

            CREATE TABLE IF NOT EXISTS weather_alerts (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                city         TEXT    NOT NULL,
                lat          REAL    NOT NULL,
                lon          REAL    NOT NULL,
                metric       TEXT    NOT NULL,   -- 'temp'|'humidity'|'wind_speed'|'condition'
                operator     TEXT    NOT NULL,   -- 'gt'|'lt'|'eq'
                threshold    REAL,
                cond_value   TEXT,               -- for condition-based alerts
                is_active    INTEGER NOT NULL DEFAULT 1,
                last_checked TEXT,
                triggered_at TEXT,
                created_at   TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS search_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
                city        TEXT NOT NULL,
                country     TEXT NOT NULL DEFAULT '',
                lat         REAL,
                lon         REAL,
                temp        REAL,
                feels_like  REAL,
                humidity    INTEGER,
                wind_speed  REAL,
                condition   TEXT,
                icon        TEXT,
                searched_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_hist_user    ON search_history(user_id, searched_at DESC);
            CREATE INDEX IF NOT EXISTS idx_alerts_user  ON weather_alerts(user_id);
            CREATE INDEX IF NOT EXISTS idx_locs_user    ON saved_locations(user_id);
        ");
    }

    // ── Query helpers ─────────────────────────────────────────
    public static function run(string $sql, array $params = []): PDOStatement {
        $stmt = self::get()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public static function fetch(string $sql, array $params = []): ?array {
        return self::run($sql, $params)->fetch() ?: null;
    }

    public static function fetchAll(string $sql, array $params = []): array {
        return self::run($sql, $params)->fetchAll();
    }

    public static function lastId(): string|false {
        return self::get()->lastInsertId();
    }
}
