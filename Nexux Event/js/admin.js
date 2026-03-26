// Admin login + guard for Nexus Events

document.addEventListener('DOMContentLoaded', () => {
  const AUTH_KEY = 'nexusAdminAuth';
  const USER = 'admin';
  const PASS = 'nexus2026';

  const page = document.body.dataset.page;

  if (page === 'admin-login' || page === 'admin') {
    if (localStorage.getItem(AUTH_KEY) === 'true') {
      window.location.href = 'admin/index.html';
      return;
    }
    const form = document.querySelector('[data-admin-form]');
    const status = document.querySelector('[data-admin-status]');
    const userInput = document.querySelector('[data-admin-user]');
    const passInput = document.querySelector('[data-admin-pass]');

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const user = userInput ? userInput.value.trim() : '';
        const pass = passInput ? passInput.value.trim() : '';

        if (user === USER && pass === PASS) {
          localStorage.setItem(AUTH_KEY, 'true');
          window.location.href = 'admin/index.html';
        } else {
          if (status) {
            status.textContent = 'Invalid admin credentials. Try admin / nexus2026.';
            status.classList.add('status', 'status--red');
          }
        }
      });
    }
  }

  if (page === 'admin-dashboard') {
    if (localStorage.getItem(AUTH_KEY) !== 'true') {
      window.location.href = '../admin-login.html';
      return;
    }

    const logout = document.querySelector('[data-admin-logout]');
    if (logout) {
      logout.addEventListener('click', () => {
        localStorage.removeItem(AUTH_KEY);
        window.location.href = '../admin-login.html';
      });
    }
  }
});
