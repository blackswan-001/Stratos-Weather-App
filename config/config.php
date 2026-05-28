<?php
// ============================================================
//  WEATHER APP — config/config.php
//  Global constants. Edit API_KEY before running.
// ============================================================

define('APP_NAME',    'Stratos');
define('APP_VERSION', '1.0.0');

// ── OpenWeatherMap ───────────────────────────────────────────
// Free key: https://openweathermap.org/api
define('OWM_API_KEY', 'OWM_API_KEY_HERE');
define('OWM_BASE',    'https://api.openweathermap.org/data/2.5');
define('OWM_GEO',     'https://api.openweathermap.org/geo/1.0');

// ── Database ─────────────────────────────────────────────────
define('DB_PATH', __DIR__ . '/../database/stratos.sqlite');

// ── Session ───────────────────────────────────────────────────
define('SESSION_NAME',     'stratos_sess');
define('SESSION_LIFETIME', 60 * 60 * 24 * 7); // 7 days

// ── App ────────────────────────────────────────────────────────
define('AUTO_REFRESH_MIN', 10);   // minutes between auto-refresh
define('HISTORY_LIMIT',    50);   // max rows kept per user
define('ALERTS_LIMIT',     10);   // max alerts per user

// ── Error reporting (turn off for demo) ──────────────────────
ini_set('display_errors', 0);
error_reporting(E_ALL);

// ── CORS / JSON helper ────────────────────────────────────────
function json_out(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function json_err(string $msg, int $status = 400): never {
    json_out(['ok' => false, 'error' => $msg], $status);
}
