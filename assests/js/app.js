/* ============================================================
   app.js — Router, settings, bootstrap
   ============================================================ */
"use strict";

// ── Router ────────────────────────────────────────────────────
const Router = {
  current: 'dashboard',

  navigate(page) {
    if (this.current === page) return;
    this.current = page;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Show/hide pages
    document.querySelectorAll('.page').forEach(el => {
      el.classList.remove('active');
    });
    const target = document.getElementById('page-' + page);
    if (target) {
      target.classList.add('active');
      this.loadPage(page);
    }

    // Update URL hash without full nav
    history.replaceState(null, '', '#' + page);

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
  },

  loadPage(page) {
    switch(page) {
      case 'dashboard':
        if (App.currentCity) fetchWeather(App.currentCity.lat, App.currentCity.lon);
        else loadDefaultCity();
        break;
      case 'map':
        renderMapPage();
        break;
      case 'alerts':
        renderAlertsPage();
        break;
      case 'history':
        renderHistoryPage();
        break;
      case 'settings':
        renderSettingsPage();
        break;
    }
  }
};

App.router = Router;

// ── Nav click handlers ────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    Router.navigate(el.dataset.page);
  });
});

// ── Topbar controls ───────────────────────────────────────────
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.getElementById('unitToggle').addEventListener('click', toggleUnit);
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Settings page ─────────────────────────────────────────────
function renderSettingsPage() {
  const page = document.getElementById('page-settings');
  const isMetric = App.unit === 'metric';
  const isDark   = App.theme === 'dark';

  page.innerHTML = `
    <div class="page-header"><h1 class="page-title display">Settings</h1></div>

    <div style="max-width:600px;display:flex;flex-direction:column;gap:1.5rem;">

      <div class="settings-section">
        <div class="settings-title">Display</div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Dark Mode</div>
            <div class="settings-row-sub">Switch between dark and light interface</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="darkModeToggle" ${isDark ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Temperature Unit</div>
            <div class="settings-row-sub">Celsius or Fahrenheit</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="unitToggleSetting" ${!isMetric ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row" style="flex-wrap:wrap;gap:.5rem;">
          <div>
            <div class="settings-row-label">Current Unit</div>
            <div class="settings-row-sub">Active temperature scale</div>
          </div>
          <span class="chip chip-accent">${isMetric ? '°C — Celsius' : '°F — Fahrenheit'}</span>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-title">Saved Locations</div>
        ${App.user && App.savedLocations.length ? `
        <div style="display:flex;flex-direction:column;gap:.5rem;" id="settingsLocList">
          ${App.savedLocations.map(l => `
          <div class="settings-row">
            <div class="location-item" style="flex:1;margin:0;padding:.5rem .75rem;cursor:default;">
              <svg class="location-pin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <div class="location-item-body">
                <div class="location-item-name">${l.label || l.city}</div>
                <div class="location-item-sub">${l.city}, ${l.country}</div>
              </div>
            </div>
            <button class="btn-danger" style="flex-shrink:0;" onclick="deleteLocation(${l.id})">Remove</button>
          </div>`).join('')}
        </div>` : `
        <div class="empty-state" style="padding:1.5rem;">
          <div class="empty-sub">${App.user ? 'No saved locations yet. Search a city and click Save.' : 'Sign in to save locations.'}</div>
        </div>`}
      </div>

      <div class="settings-section">
        <div class="settings-title">Account</div>
        ${App.user ? `
        <div class="settings-row">
          <div>
            <div class="settings-row-label">${App.user.username}</div>
            <div class="settings-row-sub">${App.user.email}</div>
          </div>
          <span class="chip chip-green">Signed in</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">Sign Out</div>
          <button class="btn-danger" onclick="document.getElementById('logoutBtn').click()">Sign Out</button>
        </div>` : `
        <div class="settings-row">
          <div class="settings-row-label">Not signed in</div>
          <button class="btn-primary" onclick="location.reload()">Sign In</button>
        </div>`}
      </div>

      <div class="settings-section">
        <div class="settings-title">About</div>
        <div class="settings-row">
          <div class="settings-row-label">Version</div>
          <span class="chip chip-blue">1.0.0</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">Data Source</div>
          <span style="font-size:.82rem;color:var(--text-tertiary);">OpenWeatherMap API</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">Stack</div>
          <span style="font-size:.82rem;color:var(--text-tertiary);">PHP · SQLite · Leaflet · Chart.js</span>
        </div>
      </div>
    </div>`;

  // Toggles
  document.getElementById('darkModeToggle').addEventListener('change', function() {
    applyTheme(this.checked ? 'dark' : 'light');
    if (App.user) apiPost('/api/auth.php', { action:'update', theme_pref: App.theme }).catch(()=>{});
  });
  document.getElementById('unitToggleSetting').addEventListener('change', function() {
    applyUnit(this.checked ? 'imperial' : 'metric');
    if (App.user) apiPost('/api/auth.php', { action:'update', unit_pref: App.unit }).catch(()=>{});
    if (App.currentCity) fetchWeather(App.currentCity.lat, App.currentCity.lon);
  });
}

async function deleteLocation(id) {
  try {
    await apiPost('/api/locations.php', { action: 'delete', id });
    App.savedLocations = App.savedLocations.filter(l => l.id !== id);
    toast('Location removed', 'info');
    renderSettingsPage();
  } catch(e) { toast(e.message, 'error'); }
}

// ── Default city load ─────────────────────────────────────────
function loadDefaultCity() {
  const last = sessionStorage.getItem('lastCity');
  if (last) {
    const { lat, lon } = JSON.parse(last);
    fetchWeather(lat, lon);
  } else {
    fetchWeatherByQuery('London');
  }
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Apply stored theme & unit before anything renders
  applyTheme(App.theme);
  applyUnit(App.unit);

  // Initialise auth (shows app or auth overlay)
  await initAuth();

  // Init search + geo button
  initSearch();
  initGeoBtn();

  // Load saved locations
  await loadSavedLocations();

  // Navigate to page from hash or default
  const hash = location.hash.replace('#', '') || 'dashboard';
  const validPages = ['dashboard','map','alerts','history','settings'];
  Router.navigate(validPages.includes(hash) ? hash : 'dashboard');

  // Handle fav-item clicks via delegation (they are rendered dynamically)
  document.getElementById('page-dashboard').addEventListener('click', e => {
    const fav = e.target.closest('.fav-item');
    if (fav) fetchWeather(+fav.dataset.lat, +fav.dataset.lon);
  });
});

window.deleteLocation   = deleteLocation;
window.renderSettingsPage = renderSettingsPage;
