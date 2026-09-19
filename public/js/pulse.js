/* Shared account, dialog, viewport and icon UI. No framework required. */
window.Pulse = (() => {
  const nativeFetch = window.fetch.bind(window);
  let csrf = '';
  let role = 'viewer';
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const paths = {
    terminal: '<path d="m5 7 5 5-5 5m8 0h6"/>',
    finder: '<path d="M3 7V5h7l2 2h9v13H3z"/>',
    editor: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 20"/>',
    monitor: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
    browser: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c6 6 6 12 0 18-6-6-6-12 0-18"/>',
    linux: '<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    settings: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
    about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v2"/>'
  };
  function icon(name) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.finder}</svg>`;
  }
  function showLogin(message = '') {
    const dialog = document.getElementById('pulse-login');
    document.getElementById('login-error').textContent = message;
    if (!dialog.open) dialog.showModal();
  }
  function acceptSession(data) {
    csrf = data.csrf;
    role = data.role;
    document.body.dataset.role = role;
    document.getElementById('pulse-account').textContent = `${data.username} · ${role === 'admin' ? '관리자' : '조회 전용'}`;
    document.getElementById('pulse-login').close();
    resolveReady();
  }
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return nativeFetch(input, options);
    const headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
    if (csrf) headers.set('X-CSRF-Token', csrf);
    const response = await nativeFetch(input, { ...options, headers });
    if (response.status === 401) showLogin('세션이 만료되었습니다. 다시 로그인하세요.');
    return response;
  };
  async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || data.output || '요청에 실패했습니다.');
    return data;
  }
  function post(url, data = {}) {
    return api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  }
  // Queue dialogs to avoid conflicting simultaneous confirmations.
  let dialogQueue = Promise.resolve();
  function ask(message, { input = false, value = '', confirm = '확인', cancel = true } = {}) {
    const run = () => new Promise(resolve => {
      const dialog = document.getElementById('pulse-dialog');
      const form = dialog.querySelector('form');
      const field = document.getElementById('pulse-dialog-input');
      document.getElementById('pulse-dialog-message').textContent = message;
      field.hidden = !input;
      field.value = value;
      field.onkeydown = event => {
        if (event.key === 'Enter') { event.preventDefault(); form.requestSubmit(document.getElementById('pulse-dialog-ok')); }
      };
      document.getElementById('pulse-dialog-ok').textContent = confirm;
      document.getElementById('pulse-dialog-cancel').hidden = !cancel;
      let result = null;
      form.onsubmit = event => {
        event.preventDefault();
        result = event.submitter?.value === 'cancel' ? null : input ? field.value : true;
        dialog.close();
      };
      dialog.onclose = () => resolve(result);
      dialog.showModal();
      (input ? field : document.getElementById('pulse-dialog-ok')).focus();
    });
    const next = dialogQueue.then(run);
    dialogQueue = next.catch(() => {});
    return next;
  }
  function viewport() {
    const desktop = document.getElementById('view-desktop');
    if (desktop && !desktop.classList.contains('hidden')) {
      document.documentElement.style.setProperty('--pulse-top', `${Math.max(0, desktop.getBoundingClientRect().top)}px`);
    }
    document.documentElement.style.setProperty('--pulse-vh', `${window.visualViewport?.height || window.innerHeight}px`);
  }
  async function initialize() {
    viewport();
    window.addEventListener('resize', viewport);
    window.visualViewport?.addEventListener('resize', viewport);
    document.querySelectorAll('.shortcut-symbol, .dock-icon, .win-title-icon').forEach(el => {
      const app = el.closest('[data-app]')?.dataset.app;
      if (app) el.innerHTML = icon(app);
    });
    document.getElementById('pulse-login').addEventListener('cancel', event => event.preventDefault());
    document.getElementById('pulse-login-form').addEventListener('submit', async event => {
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      try {
        const result = await post('/api/auth/login', {
          username: document.getElementById('login-user').value,
          password: document.getElementById('login-password').value
        });
        document.getElementById('login-password').value = '';
        acceptSession(result);
      } catch (error) { showLogin(error.message); }
      finally { button.disabled = false; }
    });
    document.getElementById('pulse-logout').addEventListener('click', async () => {
      if (window.Pulse.canLeave && !await window.Pulse.canLeave()) return;
      try { await post('/api/auth/logout'); location.reload(); }
      catch (error) { await ask(error.message, { cancel: false }); }
    });
    try {
      const result = await api('/api/auth/status');
      if (result.authenticated) acceptSession(result);
      else showLogin(result.configured ? '' : '최초 설정: Termux에서 python3 setup-auth.py 실행 후 서버를 재시작하세요.');
    } catch (error) { showLogin('서버 연결 실패. 새로고침하여 다시 시도하세요.'); }
  }
  document.addEventListener('DOMContentLoaded', initialize);
  return { ready, api, post, ask, icon, viewport, get csrf() { return csrf; }, get isAdmin() { return role === 'admin'; } };
})();
