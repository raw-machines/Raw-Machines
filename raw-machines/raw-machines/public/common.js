const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b >= 1024 ? Math.round(b / 1024) + ' KB' : b ? b + ' B' : '');
const tile = (a) => a.icon_url ? `<img src="${esc(a.icon_url)}" alt="">` : `<div class="ph">${esc((a.name || '?')[0].toUpperCase())}</div>`;
let ME = null;
window.AUTH_ROLE = window.AUTH_ROLE || 'user';

async function api(path, opts = {}) {
  const r = await fetch('/api/' + path, {
    credentials: 'same-origin',
    ...opts,
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  let d = {};
  try { d = await r.json(); } catch {}
  if (!r.ok) throw new Error(d.error || 'Request failed (' + r.status + ')');
  return d;
}

async function loadMe() {
  try { ME = (await api('auth?action=me')).user; } catch { ME = null; }
  renderAuthBox();
}

function renderAuthBox() {
  const box = $('#authbox');
  if (!box) return;
  box.innerHTML = ME
    ? `<small>${esc(ME.name)}</small> <button class="link" id="lo">Log out</button>`
    : `<button class="btn alt" id="li">Log in</button>`;
  const lo = $('#lo'), li = $('#li');
  if (lo) lo.onclick = async () => { await api('auth?action=logout', { method: 'POST' }); ME = null; renderAuthBox(); window.onAuth && window.onAuth(); };
  if (li) li.onclick = authModal;
}

function authModal() {
  const d = $('#dlg');
  let mode = 'login';
  const dev = window.AUTH_ROLE === 'developer';
  const draw = () => {
    d.innerHTML = `<form id="af"><h3>${mode === 'login' ? 'Log in' : 'Create account'}${dev ? ' (developer)' : ''}</h3>
      ${mode === 'register' ? '<label>Name</label><input name="name" required maxlength="60" autocomplete="name">' : ''}
      <label>Email</label><input name="email" type="email" required autocomplete="email">
      <label>Password</label><input name="password" type="password" required minlength="8" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}">
      <p class="err" id="ae"></p>
      <button class="btn" id="sb">${mode === 'login' ? 'Log in' : 'Create account'}</button><br>
      <button type="button" class="link" id="sw">${mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}</button>
      <button type="button" class="link" id="cl">Close</button></form>`;
    $('#sw').onclick = () => { mode = mode === 'login' ? 'register' : 'login'; draw(); };
    $('#cl').onclick = () => d.close();
    $('#af').onsubmit = async (e) => {
      e.preventDefault();
      $('#sb').disabled = true;
      try {
        const body = { ...Object.fromEntries(new FormData(e.target)), role: window.AUTH_ROLE };
        ME = (await api('auth?action=' + mode, { method: 'POST', body })).user;
        d.close(); renderAuthBox(); window.onAuth && window.onAuth();
      } catch (err) { $('#ae').textContent = err.message; $('#sb').disabled = false; }
    };
  };
  draw();
  d.showModal();
}
