<?php
// ============================================================
//  api/history.php — search history retrieval & clear
// ============================================================
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

session_name(SESSION_NAME);
session_start();

$uid    = $_SESSION['user_id'] ?? null;
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? $_GET['action'] ?? 'list';

match($action) {
    'list'  => handle_list($uid),
    'clear' => handle_clear($uid),
    default => json_err('Unknown action')
};

function handle_list(?int $uid): void {
    if (!$uid) { json_out(['ok' => true, 'history' => []]); }
    $rows = DB::fetchAll(
        'SELECT * FROM search_history WHERE user_id = ? ORDER BY searched_at DESC LIMIT ?',
        [$uid, HISTORY_LIMIT]
    );
    json_out(['ok' => true, 'history' => $rows]);
}

function handle_clear(?int $uid): void {
    if (!$uid) json_err('Authentication required', 401);
    DB::run('DELETE FROM search_history WHERE user_id = ?', [$uid]);
    json_out(['ok' => true]);
}
