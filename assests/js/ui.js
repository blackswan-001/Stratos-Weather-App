/* ============================================================
   ui.js — Theme, toasts, modals, unit system, global utils
   ============================================================ */
"use strict";

// ── Global state ─────────────────────────────────────────────
window.App = window.App || {};
App.unit    = localStorage.getItem('unit')  || 'metric';
App.theme   = localStorage.getItem('theme') || 'dark';
App.user    = null;

// ── Theme ─────────────────────────────────────────────────────
function applyTheme(t) {
  App.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  const moon = document.querySelector('.icon-moon');
  const sun  = document.querySelector('.icon-sun');
  if (moon && sun) {
    moon.classList.toggle('hidden', t === 'light');
    sun.classList.toggle('hidden',  t === 'dark');
  }
}

function toggleTheme() {
  applyTheme(App.theme === 'dark' ? 'light' : 'dark');
  if (App.user) {
    apiPost('/api/auth.php', { action: 'update', theme_pref: App.theme }).catch(() => {});
  }
}

// ── Unit system ───────────────────────────────────────────────
function applyUnit(u) {
  App.unit = u;
  localStorage.setItem('unit', u);
  const lbl = document.getElementById('unitLabel');
  if (lbl) lbl.textContent = u === 'metric' ? '°C' : '°F';
}

function toggleUnit() {
  applyUnit(App.unit === 'metric' ? 'imperial' : 'metric');
  if (App.user) {
    apiPost('/api/auth.php', { action: 'update', unit_pref: App.unit }).catch(() => {});
  }
  // Re-fetch current weather with new unit
  if (App.currentCity) fetchWeather(App.currentCity.lat, App.currentCity.lon);
}

// ── Toast notifications ───────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const icons = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = (icons[type] || icons.info) + `<span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-exit');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}

// ── Modal ──────────────────────────────────────────────────────
function openModal(html, onClose) {
  closeModal();
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  bd.id = 'activeModal';
  bd.innerHTML = `<div class="modal">${html}</div>`;
  bd.addEventListener('click', e => { if (e.target === bd) closeModal(onClose); });
  document.body.appendChild(bd);
  return bd;
}
function closeModal(cb) {
  const m = document.getElementById('activeModal');
  if (m) m.remove();
  if (cb) cb();
}

// ── API helpers ────────────────────────────────────────────────
async function apiGet(endpoint, params = {}) {
  const qs  = new URLSearchParams(params).toString();
  const url = qs ? `${endpoint}?${qs}` : endpoint;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
  return data;
}

async function apiPost(endpoint, body = {}) {
  const res  = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Date / time helpers ────────────────────────────────────────
function formatUnixTime(unix, tzOffset) {
  const d = new Date((unix + tzOffset) * 1000);
  return d.toUTCString().slice(17, 22); // HH:MM
}

function formatUnixDateTime(unix, tzOffset) {
  const d = new Date((unix + tzOffset) * 1000);
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} · ${
    String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
}

function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

// ── Wind direction label ───────────────────────────────────────
function windDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ── Expose ────────────────────────────────────────────────────
Object.assign(window, {
  applyTheme, toggleTheme, applyUnit, toggleUnit,
  toast, openModal, closeModal,
  apiGet, apiPost,
  formatUnixTime, formatUnixDateTime, relativeTime, windDir
});
