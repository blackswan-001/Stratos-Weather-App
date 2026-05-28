<?php
// ============================================================
//  index.php — App entry point & router
// ============================================================
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

session_name(SESSION_NAME);
session_set_cookie_params(['lifetime' => SESSION_LIFETIME, 'samesite' => 'Lax']);
session_start();

// ── API routing ───────────────────────────────────────────────
$req  = $_SERVER['REQUEST_URI'];
$path = parse_url($req, PHP_URL_PATH);
$path = rtrim($path, '/');

$script = dirname($_SERVER['SCRIPT_NAME']);
if ($script !== '/' && str_starts_with($path, $script)) {
    $path = substr($path, strlen($script));
}

if (str_starts_with($path, '/api/')) {
    $endpoint = substr($path, 5);
    $file = __DIR__ . '/api/' . preg_replace('/[^a-z_]/', '', $endpoint) . '.php';
    if (file_exists($file)) { require $file; exit; }
    json_err('Unknown API endpoint', 404);
}

// ── SPA shell ─────────────────────────────────────────────────
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Stratos — Weather Intelligence</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="assets/css/themes.css" />
  <link rel="stylesheet" href="assets/css/main.css" />
  <link rel="stylesheet" href="assets/css/components.css" />
  <!-- Expose OWM key to JS for Leaflet weather tile overlays -->
  <script>window.OWM_KEY = "<?= OWM_API_KEY ?>";</script>
</head>
<body>

<!-- ── Auth overlay ── -->
<div id="authOverlay" class="auth-overlay hidden">
  <div class="auth-box">
    <div class="auth-logo">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="var(--accent)"/>
        <path d="M8 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <path d="M16 8v2M10.3 10.3l1.4 1.4M21.7 10.3l-1.4 1.4" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <span>Stratos</span>
    </div>
    <div class="auth-tabs">
      <button class="auth-tab active" data-tab="login">Sign In</button>
      <button class="auth-tab" data-tab="register">Create Account</button>
    </div>
    <!-- Login -->
    <div id="loginForm" class="auth-form">
      <div class="field-group">
        <label>Email</label>
        <input type="email" id="loginEmail" placeholder="you@email.com" autocomplete="email" />
      </div>
      <div class="field-group">
        <label>Password</label>
        <input type="password" id="loginPassword" placeholder="••••••••" autocomplete="current-password" />
      </div>
      <div class="auth-error hidden" id="loginError"></div>
      <button class="btn-primary full" id="loginBtn">Sign In</button>
      <button class="btn-ghost full" id="guestBtn">Continue as Guest</button>
    </div>
    <!-- Register -->
    <div id="registerForm" class="auth-form hidden">
      <div class="field-group">
        <label>Username</label>
        <input type="text" id="regUsername" placeholder="weatherwatcher" autocomplete="username" />
      </div>
      <div class="field-group">
        <label>Email</label>
        <input type="email" id="regEmail" placeholder="you@email.com" autocomplete="email" />
      </div>
      <div class="field-group">
        <label>Password</label>
        <input type="password" id="regPassword" placeholder="Min. 8 characters" autocomplete="new-password" />
      </div>
      <div class="auth-error hidden" id="registerError"></div>
      <button class="btn-primary full" id="registerBtn">Create Account</button>
    </div>
  </div>
</div>

<!-- ── App shell ── -->
<div id="appShell" class="app-shell hidden">

  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="var(--accent)"/>
        <path d="M8 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <path d="M16 8v2M10.3 10.3l1.4 1.4M21.7 10.3l-1.4 1.4" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <span class="logo-text">Stratos</span>
    </div>

    <nav class="sidebar-nav">
      <a class="nav-item active" data-page="dashboard" href="#dashboard">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        Dashboard
      </a>
      <a class="nav-item" data-page="map" href="#map">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
        Map
      </a>
      <a class="nav-item" data-page="alerts" href="#alerts">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        Alerts
        <span class="nav-badge hidden" id="alertsBadge">0</span>
      </a>
      <a class="nav-item" data-page="history" href="#history">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4.5"/><polyline points="3 3 3 7 7 7"/></svg>
        History
      </a>
      <a class="nav-item" data-page="settings" href="#settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Settings
      </a>
    </nav>

    <div class="sidebar-footer">
      <div class="user-chip" id="userChip">
        <div class="user-avatar" id="userAvatar">G</div>
        <div class="user-info">
          <span class="user-name" id="userName">Guest</span>
          <span class="user-role" id="userRole">Not signed in</span>
        </div>
      </div>
      <button class="btn-icon hidden" id="logoutBtn" title="Sign out">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  </aside>

  <div class="main-area">
    <header class="topbar">
      <button class="btn-icon sidebar-toggle" id="sidebarToggle">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div class="topbar-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" id="globalSearch" placeholder="Search any city…" autocomplete="off" spellcheck="false" />
        <div class="search-results hidden" id="searchResults"></div>
      </div>
      <div class="topbar-actions">
        <button class="btn-icon" id="geoLocBtn" title="Detect my location">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
        </button>
        <button class="btn-icon unit-toggle" id="unitToggle" title="Toggle °C / °F">
          <span id="unitLabel">°C</span>
        </button>
        <button class="btn-icon theme-toggle" id="themeToggle" title="Toggle theme">
          <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg class="icon-sun hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        </button>
      </div>
    </header>

    <div class="page-container">
      <div class="page active" id="page-dashboard"></div>
      <div class="page" id="page-map"></div>
      <div class="page" id="page-alerts"></div>
      <div class="page" id="page-history"></div>
      <div class="page" id="page-settings"></div>
    </div>
  </div>
</div>

<div id="toastContainer" class="toast-container"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>
<script src="assets/js/ui.js"></script>
<script src="assets/js/auth.js"></script>
<script src="assets/js/weather.js"></script>
<script src="assets/js/charts.js"></script>
<script src="assets/js/map.js"></script>
<script src="assets/js/alerts.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>
