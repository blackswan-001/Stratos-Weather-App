<?php
// ============================================================
//  api/locations.php — saved/favourite locations CRUD
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
    'save'   => handle_save($uid, $body),
    'delete' => handle_delete($uid, $body),
    default  => json_err('Unknown action')
};

function handle_list(int $uid): void {
    $rows = DB::fetchAll(
        'SELECT * FROM saved_locations WHERE user_id = ? ORDER BY added_at DESC', [$uid]
    );
    json_out(['ok' => true, 'locations' => $rows]);
}

function handle_save(int $uid, array $b): void {
    $city    = trim($b['city']    ?? '');
    $country = trim($b['country'] ?? '');
    $lat     = (float)($b['lat'] ?? 0);
    $lon     = (float)($b['lon'] ?? 0);
    $label   = trim($b['label']   ?? $city);

    if (!$city || !$lat || !$lon) json_err('city, lat and lon are required.');

    // Check limit
    $count = DB::fetch('SELECT COUNT(*) AS c FROM saved_locations WHERE user_id = ?', [$uid])['c'];
    if ($count >= 20) json_err('You can save up to 20 locations.');

    try {
        DB::run(
            'INSERT OR IGNORE INTO saved_locations (user_id, city, country, lat, lon, label) VALUES (?,?,?,?,?,?)',
            [$uid, $city, $country, $lat, $lon, $label]
        );
    } catch (Exception $e) {
        json_err('Could not save location.');
    }

    $loc = DB::fetch('SELECT * FROM saved_locations WHERE user_id = ? AND lat = ? AND lon = ?', [$uid, $lat, $lon]);
    json_out(['ok' => true, 'location' => $loc]);
}

function handle_delete(int $uid, array $b): void {
    $id = (int)($b['id'] ?? 0);
    if (!$id) json_err('id is required.');
    DB::run('DELETE FROM saved_locations WHERE id = ? AND user_id = ?', [$id, $uid]);
    json_out(['ok' => true]);
}
