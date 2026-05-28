/* ============================================================
   weather.js — Fetch weather, render dashboard, autocomplete
   ============================================================ */
"use strict";

App.currentCity    = null;
App.savedLocations = [];
let searchDebounce = null;
let refreshTimer   = null;

// ── Public: fetch & render weather ────────────────────────────
async function fetchWeather(lat, lon, cityName) {
  renderDashboardSkeleton();
  clearTimeout(refreshTimer);
  try {
    const [cur, fc] = await Promise.all([
      apiGet('/api/weather.php', { action: 'current',  lat, lon, units: App.unit }),
      apiGet('/api/weather.php', { action: 'forecast', lat, lon, units: App.unit }),
    ]);
    App.currentCity = cur;
    renderDashboard(cur, fc.forecast);
    scheduleRefresh(lat, lon);
    // Check alerts in background
    if (App.user) checkAlerts();
  } catch(e) {
    renderDashboardError(e.message);
  }
}

async function fetchWeatherByQuery(q) {
  renderDashboardSkeleton();
  clearTimeout(refreshTimer);
  try {
    const [cur, fc] = await Promise.all([
      apiGet('/api/weather.php', { action: 'current',  q, units: App.unit }),
      apiGet('/api/weather.php', { action: 'forecast', q, units: App.unit }),
    ]);
    App.currentCity = cur;
    renderDashboard(cur, fc.forecast);
    scheduleRefresh(cur.lat, cur.lon);
    if (App.user) checkAlerts();
  } catch(e) {
    renderDashboardError(e.message);
  }
}

function scheduleRefresh(lat, lon) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => fetchWeather(lat, lon), 10 * 60 * 1000);
}

// ── Render: dashboard skeleton ────────────────────────────────
function renderDashboardSkeleton() {
  document.getElementById('page-dashboard').innerHTML = `
    <div class="page-header">
      <h1 class="page-title display">Dashboard</h1>
    </div>
    <div class="dashboard-grid">
      <div class="hero-card" style="min-height:320px;display:flex;align-items:center;justify-content:center;">
        <div style="color:var(--text-tertiary);font-size:.9rem;">Loading weather…</div>
      </div>
      <div class="card" style="min-height:140px;"></div>
      <div class="card" style="min-height:140px;"></div>
    </div>`;
}

function renderDashboardError(msg) {
  document.getElementById('page-dashboard').innerHTML = `
    <div class="page-header"><h1 class="page-title display">Dashboard</h1></div>
    <div class="empty-state">
      <div class="empty-icon">⚡</div>
      <div class="empty-title">Could not load weather</div>
      <div class="empty-sub">${msg}</div>
    </div>`;
}

// ── Render: full dashboard ────────────────────────────────────
function renderDashboard(w, forecast) {
  const isSaved    = App.savedLocations.some(l => Math.abs(l.lat - w.lat) < 0.01 && Math.abs(l.lon - w.lon) < 0.01);
  const tempUnit   = App.unit === 'metric' ? '°C' : '°F';
  const speedUnit  = w.speed_unit || (App.unit === 'metric' ? 'km/h' : 'mph');
  const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const forecastHtml = (forecast || []).map(d => {
    const dn = dayNames[new Date(d.date + 'T12:00:00').getDay()];
    return `
    <div class="forecast-day">
      <span class="fc-day-name">${dn}</span>
      <img class="fc-icon" src="https://openweathermap.org/img/wn/${d.icon}@2x.png" alt="${d.description}" />
      <span class="fc-max">${d.temp_max}${tempUnit}</span>
      <span class="fc-min">${d.temp_min}${tempUnit}</span>
      ${d.pop ? `<span class="fc-pop">💧 ${d.pop}%</span>` : ''}
    </div>`;
  }).join('');

  document.getElementById('page-dashboard').innerHTML = `
    <div class="page-header">
      <h1 class="page-title display">Dashboard</h1>
      <div style="display:flex;gap:.5rem;align-items:center;">
        <span class="chip chip-${conditionChip(w.condition)}">${w.condition}</span>
        <span style="font-size:.75rem;color:var(--text-tertiary);">Updated just now</span>
      </div>
    </div>

    <div class="dashboard-grid">

      <!-- Hero card -->
      <div class="hero-card">
        <div class="hero-location">
          <div>
            <div class="hero-city">${w.city}</div>
            <div class="hero-country">${w.country}</div>
            <div class="hero-time">${formatUnixDateTime(w.dt, w.timezone)}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.5rem;">
            <img class="hero-icon" src="https://openweathermap.org/img/wn/${w.icon}@2x.png" alt="${w.description}" />
            ${App.user ? `
            <button class="save-btn ${isSaved ? 'saved' : ''}" id="saveLocBtn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              ${isSaved ? 'Saved' : 'Save'}
            </button>` : ''}
          </div>
        </div>

        <div class="hero-temp-row">
          <span class="hero-temp-big">${w.temp}</span>
          <span class="hero-temp-unit">${tempUnit}</span>
          <div class="hero-side">
            <span class="hero-condition">${w.description}</span>
            <span class="hero-feels">Feels like ${w.feels_like}${tempUnit}</span>
            <span class="hero-range">↑ ${w.temp_max}${tempUnit} &nbsp; ↓ ${w.temp_min}${tempUnit}</span>
          </div>
        </div>

        <div class="hero-stats">
          <div class="hero-stat">
            <span class="hero-stat-val">${w.humidity}%</span>
            <span class="hero-stat-label">Humidity</span>
            <div class="progress-bar mt-1"><div class="progress-fill blue" style="width:${w.humidity}%"></div></div>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-val">${w.wind_speed}</span>
            <span class="hero-stat-label">Wind ${speedUnit} · ${windDir(w.wind_deg)}</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-val">${w.pressure}</span>
            <span class="hero-stat-label">Pressure hPa</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-val">${w.visibility ?? '–'}</span>
            <span class="hero-stat-label">Visibility km</span>
          </div>
        </div>
      </div>

      <!-- Forecast card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">5-Day Forecast</span>
        </div>
        <div class="forecast-strip">${forecastHtml}</div>
      </div>

      <!-- Details card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Conditions Detail</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:.6rem;">
          <div class="sun-card">
            <div class="sun-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2"/></svg>
              <span class="sun-label">Sunrise</span>
              <span class="sun-time">${formatUnixTime(w.sunrise, w.timezone)}</span>
            </div>
            <div class="sun-divider"></div>
            <div class="sun-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <span class="sun-label">Sunset</span>
              <span class="sun-time">${formatUnixTime(w.sunset, w.timezone)}</span>
            </div>
          </div>
          ${w.clouds !== undefined ? `
          <div class="stat-pill">
            <div class="stat-pill-icon blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg></div>
            <div><div class="stat-pill-val">${w.clouds}%</div><div class="stat-pill-label">Cloud cover</div></div>
          </div>` : ''}
          ${w.wind_gust ? `
          <div class="stat-pill">
            <div class="stat-pill-icon orange"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg></div>
            <div><div class="stat-pill-val">${w.wind_gust} ${speedUnit}</div><div class="stat-pill-label">Wind gust</div></div>
          </div>` : ''}
        </div>
      </div>

      <!-- Saved locations widget -->
      ${renderSavedLocWidget()}

    </div>`;

  // Save button handler
  const saveBtn = document.getElementById('saveLocBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => toggleSaveLocation(w, saveBtn));
  }
}

function conditionChip(c) {
  const map = { Clear:'accent', Clouds:'blue', Rain:'blue', Drizzle:'blue',
                Thunderstorm:'red', Snow:'blue', Mist:'orange', Fog:'orange',
                Haze:'orange', Smoke:'orange', Dust:'orange', Tornado:'red' };
  return map[c] || 'blue';
}

function renderSavedLocWidget() {
  if (!App.user || !App.savedLocations.length) return '';
  const items = App.savedLocations.slice(0, 5).map(l => `
    <div class="fav-item" data-lat="${l.lat}" data-lon="${l.lon}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span class="fav-item-name">${l.label || l.city}</span>
    </div>`).join('');

  return `
    <div class="card card-sm">
      <div class="card-header"><span class="card-title">Favourites</span></div>
      <div class="fav-list">${items}</div>
    </div>`;
}

// ── Save / unsave location ────────────────────────────────────
async function toggleSaveLocation(w, btn) {
  if (!App.user) { toast('Sign in to save locations', 'warning'); return; }
  const existing = App.savedLocations.find(l => Math.abs(l.lat - w.lat) < 0.01);
  try {
    if (existing) {
      await apiPost('/api/locations.php', { action: 'delete', id: existing.id });
      App.savedLocations = App.savedLocations.filter(l => l.id !== existing.id);
      btn.classList.remove('saved');
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Save`;
      toast('Location removed', 'info');
    } else {
      const data = await apiPost('/api/locations.php', { action: 'save', city: w.city, country: w.country, lat: w.lat, lon: w.lon });
      App.savedLocations.unshift(data.location);
      btn.classList.add('saved');
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Saved`;
      toast(`${w.city} saved!`, 'success');
    }
  } catch(e) { toast(e.message, 'error'); }
}

// ── Load saved locations ──────────────────────────────────────
async function loadSavedLocations() {
  if (!App.user) return;
  try {
    const data = await apiGet('/api/locations.php', { action: 'list' });
    App.savedLocations = data.locations || [];
  } catch {}
}

// ── Autocomplete search ───────────────────────────────────────
function initSearch() {
  const input   = document.getElementById('globalSearch');
  const results = document.getElementById('searchResults');

  input.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    const q = input.value.trim();
    if (q.length < 2) { results.classList.add('hidden'); return; }
    searchDebounce = setTimeout(() => runSearch(q), 280);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { results.classList.add('hidden'); input.blur(); }
    if (e.key === 'Enter') {
      const first = results.querySelector('.search-result-item');
      if (first) first.click();
    }
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target))
      results.classList.add('hidden');
  });
}

async function runSearch(q) {
  const results = document.getElementById('searchResults');
  results.innerHTML = `<div class="search-result-item"><span class="text-tertiary text-sm">Searching…</span></div>`;
  results.classList.remove('hidden');

  try {
    const data = await apiGet('/api/weather.php', { action: 'search', q });
    if (!data.results?.length) {
      results.innerHTML = `<div class="search-result-item"><span class="text-tertiary text-sm">No results found</span></div>`;
      return;
    }
    results.innerHTML = data.results.map(r => `
      <div class="search-result-item" data-lat="${r.lat}" data-lon="${r.lon}" data-city="${r.city}">
        <span class="city-name">${r.city}${r.state ? ', ' + r.state : ''}</span>
        <span class="city-meta">${r.country}</span>
      </div>`).join('');

    results.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const lat  = parseFloat(item.dataset.lat);
        const lon  = parseFloat(item.dataset.lon);
        document.getElementById('globalSearch').value = item.querySelector('.city-name').textContent;
        results.classList.add('hidden');
        fetchWeather(lat, lon);
        App.router.navigate('dashboard');
      });
    });
  } catch {
    results.classList.add('hidden');
  }
}

// ── Geolocation button ─────────────────────────────────────────
function initGeoBtn() {
  document.getElementById('geoLocBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { toast('Geolocation not supported', 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      ()  => toast('Location access denied', 'error')
    );
  });
}

// ── Expose ────────────────────────────────────────────────────
Object.assign(window, { fetchWeather, fetchWeatherByQuery, loadSavedLocations, initSearch, initGeoBtn });
