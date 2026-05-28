/* ============================================================
   alerts.js — Weather alerts CRUD + check
   ============================================================ */
"use strict";

async function renderAlertsPage() {
  const page = document.getElementById('page-alerts');
  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title display">Weather Alerts</h1>
      ${App.user ? `<button class="btn-primary" id="newAlertBtn">+ New Alert</button>` : ''}
    </div>
    <div id="alertsList"><div style="color:var(--text-tertiary);padding:2rem;text-align:center;font-size:.875rem;">Loading…</div></div>`;

  if (!App.user) {
    document.getElementById('alertsList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔔</div>
        <div class="empty-title">Sign in to use alerts</div>
        <div class="empty-sub">Create custom alerts for temperature, wind, humidity, or weather conditions.</div>
      </div>`;
    return;
  }

  await loadAlerts();
  document.getElementById('newAlertBtn')?.addEventListener('click', openNewAlertModal);
}

async function loadAlerts() {
  try {
    const data = await apiGet('/api/alerts.php', { action: 'list' });
    renderAlertsList(data.alerts || []);
    updateAlertBadge(data.alerts?.length || 0);
  } catch(e) {
    document.getElementById('alertsList').innerHTML = `<div class="empty-sub" style="padding:2rem;text-align:center;">${e.message}</div>`;
  }
}

function renderAlertsList(alerts) {
  const wrap = document.getElementById('alertsList');
  if (!alerts.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔕</div>
        <div class="empty-title">No alerts yet</div>
        <div class="empty-sub">Add alerts to get notified when weather conditions meet your criteria.</div>
      </div>`;
    return;
  }

  wrap.innerHTML = `<div style="display:flex;flex-direction:column;gap:.6rem;">
    ${alerts.map(a => `
    <div class="alert-item ${a.triggered_at ? 'triggered' : ''}" data-id="${a.id}">
      <div class="alert-item-icon ${metricColor(a.metric)}">${metricIcon(a.metric)}</div>
      <div class="alert-item-body">
        <div class="alert-item-title">${a.city} — ${metricLabel(a.metric)} ${operatorLabel(a.operator)} ${a.threshold ?? a.cond_value}</div>
        <div class="alert-item-sub">
          ${a.is_active ? '<span class="chip chip-green">Active</span>' : '<span class="chip chip-orange" style="background:var(--orange-dim);color:var(--orange)">Paused</span>'}
          ${a.triggered_at ? `&nbsp;<span class="chip chip-accent">Triggered ${relativeTime(a.triggered_at)}</span>` : ''}
          &nbsp;<span class="text-xs text-tertiary">Created ${relativeTime(a.created_at)}</span>
        </div>
      </div>
      <div class="alert-item-actions">
        <button class="btn-icon toggle-alert" data-id="${a.id}" title="${a.is_active ? 'Pause' : 'Enable'}">
          ${a.is_active
            ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
            : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`}
        </button>
        <button class="btn-icon delete-alert" data-id="${a.id}" title="Delete" style="color:var(--red)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    </div>`).join('')}
  </div>`;

  wrap.querySelectorAll('.toggle-alert').forEach(btn =>
    btn.addEventListener('click', async () => {
      await apiPost('/api/alerts.php', { action: 'toggle', id: +btn.dataset.id });
      loadAlerts();
    })
  );
  wrap.querySelectorAll('.delete-alert').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this alert?')) return;
      await apiPost('/api/alerts.php', { action: 'delete', id: +btn.dataset.id });
      toast('Alert deleted', 'info');
      loadAlerts();
    })
  );
}

function openNewAlertModal() {
  const city = App.currentCity;
  openModal(`
    <div class="modal-header">
      <span class="modal-title">New Weather Alert</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:.85rem;">
      <div class="field-group">
        <label>City</label>
        <input type="text" id="al-city" value="${city?.city || ''}" placeholder="City name" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
        <div class="field-group">
          <label>Latitude</label>
          <input type="number" id="al-lat" value="${city?.lat || ''}" step="0.001" />
        </div>
        <div class="field-group">
          <label>Longitude</label>
          <input type="number" id="al-lon" value="${city?.lon || ''}" step="0.001" />
        </div>
      </div>
      <div class="field-group">
        <label>Metric to monitor</label>
        <select id="al-metric">
          <option value="temp">Temperature (°C)</option>
          <option value="humidity">Humidity (%)</option>
          <option value="wind_speed">Wind Speed (km/h)</option>
          <option value="condition">Weather Condition</option>
        </select>
      </div>
      <div class="field-group" id="al-op-group">
        <label>Operator</label>
        <select id="al-operator">
          <option value="gt">Greater than (&gt;)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="eq">Equal to (≈)</option>
        </select>
      </div>
      <div class="field-group" id="al-threshold-group">
        <label>Threshold value</label>
        <input type="number" id="al-threshold" placeholder="e.g. 35" />
      </div>
      <div class="field-group hidden" id="al-cond-group">
        <label>Condition</label>
        <select id="al-cond">
          <option value="Clear">Clear</option>
          <option value="Clouds">Cloudy</option>
          <option value="Rain">Rain</option>
          <option value="Drizzle">Drizzle</option>
          <option value="Thunderstorm">Thunderstorm</option>
          <option value="Snow">Snow</option>
          <option value="Mist">Mist / Fog</option>
        </select>
      </div>
      <div id="al-err" class="auth-error hidden"></div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" id="al-submit">Create Alert</button>
    </div>`, null);

  // Toggle threshold vs condition field
  document.getElementById('al-metric').addEventListener('change', function() {
    const isCond = this.value === 'condition';
    document.getElementById('al-op-group').classList.toggle('hidden', isCond);
    document.getElementById('al-threshold-group').classList.toggle('hidden', isCond);
    document.getElementById('al-cond-group').classList.toggle('hidden', !isCond);
  });

  document.getElementById('al-submit').addEventListener('click', async () => {
    const btn = document.getElementById('al-submit');
    const err = document.getElementById('al-err');
    const metric = document.getElementById('al-metric').value;
    const body = {
      action:     'create',
      city:       document.getElementById('al-city').value.trim(),
      lat:        parseFloat(document.getElementById('al-lat').value),
      lon:        parseFloat(document.getElementById('al-lon').value),
      metric,
      operator:   document.getElementById('al-operator').value,
      threshold:  metric !== 'condition' ? parseFloat(document.getElementById('al-threshold').value) : null,
      cond_value: metric === 'condition' ? document.getElementById('al-cond').value : null,
    };
    err.classList.add('hidden');
    btn.textContent = 'Creating…'; btn.disabled = true;
    try {
      await apiPost('/api/alerts.php', body);
      closeModal();
      toast('Alert created!', 'success');
      loadAlerts();
    } catch(e) {
      err.textContent = e.message;
      err.classList.remove('hidden');
    } finally {
      btn.textContent = 'Create Alert'; btn.disabled = false;
    }
  });
}

async function checkAlerts() {
  try {
    const data = await apiGet('/api/alerts.php', { action: 'check' });
    if (data.triggered?.length) {
      data.triggered.forEach(a => {
        toast(`⚠ Alert: ${a.city} — ${metricLabel(a.metric)} is ${a.actual_value}`, 'warning', 6000);
      });
      updateAlertBadge(data.triggered.length);
    }
  } catch {}
}

function updateAlertBadge(n) {
  const badge = document.getElementById('alertsBadge');
  if (!badge) return;
  badge.textContent = n;
  badge.classList.toggle('hidden', n === 0);
}

function metricLabel(m) {
  return { temp:'Temperature', humidity:'Humidity', wind_speed:'Wind', condition:'Condition' }[m] || m;
}
function operatorLabel(o) { return { gt:'>', lt:'<', eq:'≈' }[o] || o; }
function metricColor(m) {
  return { temp:'accent', humidity:'blue', wind_speed:'orange', condition:'green' }[m] || 'blue';
}
function metricIcon(m) {
  const icons = {
    temp:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>`,
    humidity:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    wind_speed:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2"/><path d="M10.59 19.41A2 2 0 1 0 12 16H2"/></svg>`,
    condition: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2"/></svg>`,
  };
  return icons[m] || icons.condition;
}

window.renderAlertsPage = renderAlertsPage;
window.checkAlerts      = checkAlerts;
