<?php
// ============================================================
//  api/alerts.php — weather alerts CRUD + check
// ============================================================
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

session_name(SESSION_NAME);
session_start();

if (empty($_SESSION['user_id'])) json_err('Authentication required', 401);
$uid  = $_SESSION['user_id'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? $_GET['action'] ?? 'list';

match($action) {
    'list'   => handle_list($uid),
    'create' => handle_create($uid, $body),
    'delete' => handle_delete($uid, $body),
    'toggle' => handle_toggle($uid, $body),
    'check'  => handle_check($uid),
    default  => json_err('Unknown action')
};

function handle_list(int $uid): void {
    $rows = DB::fetchAll(
        'SELECT * FROM weather_alerts WHERE user_id = ? ORDER BY created_at DESC', [$uid]
    );
    json_out(['ok' => true, 'alerts' => $rows]);
}

function handle_create(int $uid, array $b): void {
    $city      = trim($b['city']      ?? '');
    $lat       = (float)($b['lat']    ?? 0);
    $lon       = (float)($b['lon']    ?? 0);
    $metric    = $b['metric']         ?? '';
    $operator  = $b['operator']       ?? '';
    $threshold = isset($b['threshold']) ? (float)$b['threshold'] : null;
    $cond_val  = $b['cond_value']     ?? null;

    $valid_metrics   = ['temp','humidity','wind_speed','condition'];
    $valid_operators = ['gt','lt','eq'];

    if (!$city || !$lat || !$lon) json_err('city, lat, lon are required.');
    if (!in_array($metric,   $valid_metrics))   json_err('Invalid metric.');
    if (!in_array($operator, $valid_operators)) json_err('Invalid operator.');
    if ($metric !== 'condition' && $threshold === null) json_err('Threshold is required.');
    if ($metric === 'condition' && !$cond_val)  json_err('Condition value is required.');

    $count = DB::fetch('SELECT COUNT(*) AS c FROM weather_alerts WHERE user_id = ?', [$uid])['c'];
    if ($count >= ALERTS_LIMIT) json_err('Maximum ' . ALERTS_LIMIT . ' alerts allowed.');

    DB::run(
        'INSERT INTO weather_alerts (user_id, city, lat, lon, metric, operator, threshold, cond_value)
         VALUES (?,?,?,?,?,?,?,?)',
        [$uid, $city, $lat, $lon, $metric, $operator, $threshold, $cond_val]
    );
    $alert = DB::fetch('SELECT * FROM weather_alerts WHERE id = ?', [DB::lastId()]);
    json_out(['ok' => true, 'alert' => $alert]);
}

function handle_delete(int $uid, array $b): void {
    $id = (int)($b['id'] ?? 0);
    DB::run('DELETE FROM weather_alerts WHERE id = ? AND user_id = ?', [$id, $uid]);
    json_out(['ok' => true]);
}

function handle_toggle(int $uid, array $b): void {
    $id = (int)($b['id'] ?? 0);
    DB::run('UPDATE weather_alerts SET is_active = 1-is_active WHERE id = ? AND user_id = ?', [$id, $uid]);
    json_out(['ok' => true]);
}

// ── Check all active alerts for this user against live weather ─
function handle_check(int $uid): void {
    $alerts = DB::fetchAll(
        'SELECT * FROM weather_alerts WHERE user_id = ? AND is_active = 1', [$uid]
    );
    $triggered = [];

    foreach ($alerts as $alert) {
        $url = OWM_BASE . '/weather?lat=' . $alert['lat'] . '&lon=' . $alert['lon']
             . '&appid=' . OWM_API_KEY . '&units=metric';
        $ctx = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true]]);
        $raw = @file_get_contents($url, false, $ctx);
        if (!$raw) continue;
        $w = json_decode($raw, true);
        if (($w['cod'] ?? 200) != 200) continue;

        $actual = match($alert['metric']) {
            'temp'       => (float)$w['main']['temp'],
            'humidity'   => (float)$w['main']['humidity'],
            'wind_speed' => round($w['wind']['speed'] * 3.6, 1),
            'condition'  => $w['weather'][0]['main'],
            default      => null
        };

        if ($actual === null) continue;

        $hit = false;
        if ($alert['metric'] === 'condition') {
            $hit = strtolower((string)$actual) === strtolower((string)$alert['cond_value']);
        } else {
            $hit = match($alert['operator']) {
                'gt' => $actual >  $alert['threshold'],
                'lt' => $actual <  $alert['threshold'],
                'eq' => abs($actual - $alert['threshold']) < 1,
                default => false
            };
        }

        if ($hit) {
            $triggered[] = array_merge($alert, ['actual_value' => $actual]);
            DB::run('UPDATE weather_alerts SET triggered_at = datetime("now"), last_checked = datetime("now") WHERE id = ?', [$alert['id']]);
        } else {
            DB::run('UPDATE weather_alerts SET last_checked = datetime("now") WHERE id = ?', [$alert['id']]);
        }
    }

    json_out(['ok' => true, 'triggered' => $triggered, 'checked' => count($alerts)]);
}
