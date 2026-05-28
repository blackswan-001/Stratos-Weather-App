<?php
// ============================================================
//  api/auth.php — register / login / logout / me
// ============================================================
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

session_name(SESSION_NAME);
session_set_cookie_params(['lifetime' => SESSION_LIFETIME, 'samesite' => 'Lax']);
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? $_GET['action'] ?? '';

match($action) {
    'register' => handle_register($body),
    'login'    => handle_login($body),
    'logout'   => handle_logout(),
    'me'       => handle_me(),
    'update'   => handle_update($body),
    default    => json_err('Unknown action')
};

// ── Register ──────────────────────────────────────────────────
function handle_register(array $b): void {
    $username = trim($b['username'] ?? '');
    $email    = trim($b['email']    ?? '');
    $password =      $b['password'] ?? '';

    if (strlen($username) < 3)  json_err('Username must be at least 3 characters.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_err('Invalid email address.');
    if (strlen($password) < 8)  json_err('Password must be at least 8 characters.');

    if (DB::fetch('SELECT id FROM users WHERE email = ?', [$email]))
        json_err('An account with that email already exists.');
    if (DB::fetch('SELECT id FROM users WHERE username = ?', [$username]))
        json_err('That username is already taken.');

    $hash = password_hash($password, PASSWORD_BCRYPT);
    DB::run('INSERT INTO users (username, email, password_hash) VALUES (?,?,?)',
        [$username, $email, $hash]);

    $user = DB::fetch('SELECT id, username, email, unit_pref, theme_pref FROM users WHERE email = ?', [$email]);
    $_SESSION['user_id'] = $user['id'];
    json_out(['ok' => true, 'user' => $user]);
}

// ── Login ─────────────────────────────────────────────────────
function handle_login(array $b): void {
    $email    = trim($b['email']    ?? '');
    $password =      $b['password'] ?? '';

    if (!$email || !$password) json_err('Email and password are required.');

    $user = DB::fetch('SELECT * FROM users WHERE email = ?', [$email]);
    if (!$user || !password_verify($password, $user['password_hash']))
        json_err('Invalid email or password.', 401);

    $_SESSION['user_id'] = $user['id'];
    unset($user['password_hash']);
    json_out(['ok' => true, 'user' => $user]);
}

// ── Logout ────────────────────────────────────────────────────
function handle_logout(): void {
    session_destroy();
    json_out(['ok' => true]);
}

// ── Me (session check) ────────────────────────────────────────
function handle_me(): void {
    if (empty($_SESSION['user_id'])) {
        json_out(['ok' => true, 'user' => null]);
    }
    $user = DB::fetch(
        'SELECT id, username, email, unit_pref, theme_pref FROM users WHERE id = ?',
        [$_SESSION['user_id']]
    );
    json_out(['ok' => true, 'user' => $user]);
}

// ── Update preferences ────────────────────────────────────────
function handle_update(array $b): void {
    if (empty($_SESSION['user_id'])) json_err('Not authenticated', 401);
    $uid   = $_SESSION['user_id'];
    $unit  = in_array($b['unit_pref']  ?? '', ['metric','imperial']) ? $b['unit_pref']  : null;
    $theme = in_array($b['theme_pref'] ?? '', ['dark','light'])      ? $b['theme_pref'] : null;

    if ($unit)  DB::run('UPDATE users SET unit_pref  = ? WHERE id = ?', [$unit,  $uid]);
    if ($theme) DB::run('UPDATE users SET theme_pref = ? WHERE id = ?', [$theme, $uid]);

    $user = DB::fetch('SELECT id, username, email, unit_pref, theme_pref FROM users WHERE id = ?', [$uid]);
    json_out(['ok' => true, 'user' => $user]);
}
