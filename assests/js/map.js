/* ============================================================
   map.js — Leaflet interactive weather map
   ============================================================ */
"use strict";

let leafletMap = null;
let mapMarkers = [];

async function renderMapPage() {
  const page = document.getElementById('page-map');
  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title display">Weather Map</h1>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="btn-secondary" id="mapLayerTemp">🌡 Temperature</button>
        <button class="btn-secondary" id="mapLayerClouds">☁ Clouds</button>
        <button class="btn-secondary" id="mapLayerWind">💨 Wind</button>
        <button class="btn-secondary" id="mapLayerPrecip">🌧 Precipitation</button>
      </div>
    </div>
    <div id="leaflet-map"></div>`;

  // Slight delay for DOM paint
  await new Promise(r => setTimeout(r, 60));
  initMap();
}

function initMap() {
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  leafletMap = L.map('leaflet-map', {
    center: App.currentCity ? [App.currentCity.lat, App.currentCity.lon] : [20, 0],
    zoom:   App.currentCity ? 8 : 3,
    zoomControl: true,
  });

  // Base tile layer (dark-mode aware)
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  L.tileLayer(tileUrl, {
    attribution: '© OpenStreetMap, © CartoDB',
    maxZoom: 18,
  }).addTo(leafletMap);

  // Default OWM weather layer
  addWeatherLayer('temp_new');

  // If we have current city — add marker
  if (App.currentCity) addCityMarker(App.currentCity);

  // Click-to-fetch
  leafletMap.on('click', async e => {
    const { lat, lng } = e.latlng;
    try {
      const w = await apiGet('/api/weather.php', { action: 'current', lat, lon: lng, units: App.unit });
      addCityMarker(w);
    } catch {}
  });

  // Layer buttons
  document.getElementById('mapLayerTemp')?.addEventListener('click',   () => addWeatherLayer('temp_new'));
  document.getElementById('mapLayerClouds')?.addEventListener('click', () => addWeatherLayer('clouds_new'));
  document.getElementById('mapLayerWind')?.addEventListener('click',   () => addWeatherLayer('wind_new'));
  document.getElementById('mapLayerPrecip')?.addEventListener('click', () => addWeatherLayer('precipitation_new'));

  // Add saved location markers
  App.savedLocations.forEach(loc => {
    L.circleMarker([loc.lat, loc.lon], {
      radius: 7, color: 'var(--accent)', fillColor: '#f59e0b', fillOpacity: 0.7, weight: 2
    }).bindPopup(`<strong>${loc.label || loc.city}</strong>`).addTo(leafletMap);
  });
}

let currentWeatherLayer = null;
function addWeatherLayer(layer) {
  if (currentWeatherLayer) leafletMap.removeLayer(currentWeatherLayer);
  currentWeatherLayer = L.tileLayer(
    `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${getApiKey()}`,

    { opacity: 0.55, maxZoom: 18 }
  ).addTo(leafletMap);
}

function addCityMarker(w) {
  const tempUnit = App.unit === 'metric' ? '°C' : '°F';
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      background:var(--bg-surface,#111827);
      border:2px solid var(--accent,#f59e0b);
      border-radius:12px;
      padding:4px 10px;
      font-family:'Outfit',sans-serif;
      font-size:13px;
      font-weight:700;
      color:var(--text-primary,#f0f4ff);
      white-space:nowrap;
      box-shadow:0 4px 12px rgba(0,0,0,0.4);
      display:flex;gap:5px;align-items:center;
    ">
      <img src="https://openweathermap.org/img/wn/${w.icon}.png" width="24" height="24" />
      ${w.temp}${tempUnit}
    </div>`,
    iconAnchor: [40, 16]
  });

  const marker = L.marker([w.lat, w.lon], { icon })
    .bindPopup(`
      <strong>${w.city}, ${w.country}</strong><br/>
      ${w.description} · ${w.temp}${tempUnit}<br/>
      Humidity: ${w.humidity}% · Wind: ${w.wind_speed} ${w.speed_unit}
    `)
    .addTo(leafletMap);
  mapMarkers.push(marker);
}

// API key is injected by index.php via window.OWM_KEY
function getApiKey() {
  return window.OWM_KEY || '';
}

window.renderMapPage = renderMapPage;
