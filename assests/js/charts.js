/* ============================================================
   charts.js — History charts with Chart.js
   ============================================================ */
"use strict";

let tempChart = null;
let humidChart = null;

async function renderHistoryPage() {
  const page = document.getElementById('page-history');
  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title display">Search History</h1>
      ${App.user ? `<button class="btn-danger" id="clearHistBtn">Clear History</button>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem;">
      <div class="card" style="height:180px;">
        <div class="card-header"><span class="card-title">Temperature Trend</span></div>
        <canvas id="tempChartCanvas"></canvas>
      </div>
      <div class="card" style="height:180px;">
        <div class="card-header"><span class="card-title">Humidity Trend</span></div>
        <canvas id="humidChartCanvas"></canvas>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Recent Searches</span></div>
      <div id="histTableWrap"><div style="color:var(--text-tertiary);padding:1rem;text-align:center;font-size:.875rem;">Loading…</div></div>
    </div>`;

  if (!App.user) {
    document.getElementById('histTableWrap').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔒</div>
        <div class="empty-title">Sign in to see history</div>
        <div class="empty-sub">Your search history is saved when you have an account.</div>
      </div>`;
    ['tempChartCanvas','humidChartCanvas'].forEach(id => {
      const c = document.getElementById(id);
      if (c) c.closest('.card').innerHTML = '<div class="card-header"><span class="card-title">Sign in to see charts</span></div>';
    });
    return;
  }

  try {
    const data = await apiGet('/api/history.php', { action: 'list' });
    const rows = data.history || [];
    renderHistoryCharts(rows);
    renderHistoryTable(rows, document.getElementById('histTableWrap'));

    document.getElementById('clearHistBtn')?.addEventListener('click', async () => {
      if (!confirm('Clear all search history?')) return;
      await apiPost('/api/history.php', { action: 'clear' });
      toast('History cleared', 'success');
      renderHistoryPage();
    });
  } catch(e) {
    document.getElementById('histTableWrap').innerHTML = `<div class="empty-state"><div class="empty-sub">${e.message}</div></div>`;
  }
}

function renderHistoryCharts(rows) {
  const recent = [...rows].reverse().slice(-15);
  const labels  = recent.map(r => r.city + '\n' + relativeTime(r.searched_at));
  const temps   = recent.map(r => r.temp);
  const humids  = recent.map(r => r.humidity);

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false, // allow filling the container
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim(), font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.08)' } },
      y: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim(), font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.08)' } }
    }
  };

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const blueColor   = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim();

  // Temp chart
  const tc = document.getElementById('tempChartCanvas');
  if (tc && recent.length) {
    if (tempChart) { tempChart.destroy(); tempChart = null; }
    tempChart = new Chart(tc, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: temps,
          borderColor: accentColor,
          backgroundColor: accentColor + '22',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: accentColor,
        }]
      },
      options: chartDefaults
    });
  }

  // Humidity chart
  const hc = document.getElementById('humidChartCanvas');
  if (hc && recent.length) {
    if (humidChart) { humidChart.destroy(); humidChart = null; }
    humidChart = new Chart(hc, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: humids,
          backgroundColor: blueColor + '66',
          borderColor: blueColor,
          borderWidth: 1.5,
          borderRadius: 4,
        }]
      },
      options: chartDefaults
    });
  }
}

function renderHistoryTable(rows, wrap) {
  if (!rows.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No searches yet</div><div class="empty-sub">Search for a city to begin tracking your history.</div></div>`;
    return;
  }
  const tempUnit = App.unit === 'metric' ? '°C' : '°F';
  wrap.innerHTML = `
    <table class="history-table">
      <thead><tr>
        <th>City</th><th>Condition</th>
        <th>Temp</th><th>Humidity</th><th>Wind</th><th>When</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `
        <tr style="cursor:pointer;" onclick="fetchWeather(${r.lat},${r.lon});App.router.navigate('dashboard')">
          <td><strong>${r.city}</strong> <span style="color:var(--text-tertiary);font-size:.75rem;">${r.country}</span></td>
          <td><img src="https://openweathermap.org/img/wn/${r.icon}.png" width="28" style="display:inline;vertical-align:middle;margin-right:4px;" />${r.condition}</td>
          <td>${r.temp}${tempUnit}</td>
          <td>${r.humidity}%</td>
          <td>${r.wind_speed} km/h</td>
          <td style="color:var(--text-tertiary);font-size:.78rem;">${relativeTime(r.searched_at)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

window.renderHistoryPage = renderHistoryPage;
