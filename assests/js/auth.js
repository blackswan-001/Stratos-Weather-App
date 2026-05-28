/* ============================================================
   auth.js — Login, register, session management
   ============================================================ */
"use strict";

async function initAuth() {
  try {
    const data = await apiGet('/api/auth.php', { action: 'me' });
    if (data.user) {
      setUser(data.user);
      showApp();
    } else {
      showAuthOverlay();
    }
  } catch {
    showAuthOverlay();
  }
}

function setUser(user) {
  App.user = user;
  applyTheme(user.theme_pref || App.theme);
  applyUnit(user.unit_pref  || App.unit);

  document.getElementById('userName').textContent  = user.username;
  document.getElementById('userRole').textContent  = user.email;
  document.getElementById('userAvatar').textContent = user.username[0].toUpperCase();
  document.getElementById('logoutBtn').classList.remove('hidden');
}

function showApp() {
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
}

function showAuthOverlay() {
  // Guest mode: still show app
  document.getElementById('userName').textContent = 'Guest';
  document.getElementById('userRole').textContent = 'Not signed in';
  document.getElementById('authOverlay').classList.remove('hidden');
  document.getElementById('appShell').classList.add('hidden');
}

// ── Wire up auth UI ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('loginForm').classList.toggle('hidden',    target !== 'login');
      document.getElementById('registerForm').classList.toggle('hidden', target !== 'register');
    });
  });

  // Login
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const btn   = document.getElementById('loginBtn');
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    const err   = document.getElementById('loginError');
    err.classList.add('hidden');
    btn.textContent = 'Signing in…'; btn.disabled = true;
    try {
      const data = await apiPost('/api/auth.php', { action: 'login', email, password: pass });
      setUser(data.user);
      showApp();
      App.router.navigate('dashboard');
    } catch(e) {
      err.textContent = e.message;
      err.classList.remove('hidden');
    } finally {
      btn.textContent = 'Sign In'; btn.disabled = false;
    }
  });

  // Register
  document.getElementById('registerBtn').addEventListener('click', async () => {
    const btn  = document.getElementById('registerBtn');
    const user = document.getElementById('regUsername').value.trim();
    const email= document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPassword').value;
    const err  = document.getElementById('registerError');
    err.classList.add('hidden');
    btn.textContent = 'Creating…'; btn.disabled = true;
    try {
      const data = await apiPost('/api/auth.php', { action: 'register', username: user, email, password: pass });
      setUser(data.user);
      showApp();
      App.router.navigate('dashboard');
    } catch(e) {
      err.textContent = e.message;
      err.classList.remove('hidden');
    } finally {
      btn.textContent = 'Create Account'; btn.disabled = false;
    }
  });

  // Guest
  document.getElementById('guestBtn').addEventListener('click', () => {
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
    toast('Browsing as guest — sign in to save favourites & alerts', 'info', 4500);
    App.router?.navigate('dashboard');
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await apiPost('/api/auth.php', { action: 'logout' }).catch(() => {});
    App.user = null;
    location.reload();
  });

  // Enter key on login
  ['loginEmail','loginPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('loginBtn').click();
    });
  });
});

window.initAuth = initAuth;
