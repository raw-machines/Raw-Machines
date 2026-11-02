const CATS = ['All', 'Games', 'Tools', 'Productivity', 'Social', 'Education', 'Entertainment', 'Other'];
let cat = '';
window.onAuth = () => route();

const card = (a) => `<a class="card" href="#/app/${a.id}">${tile(a)}<b>${esc(a.name)}</b><small>${esc(a.category)}${a.latest_version ? ' · v' + esc(a.latest_version) : ''}</small><small>${a.downloads} installs</small></a>`;

async function home() {
  const q = $('#q').value.trim();
  const { apps } = await api(`apps?q=${encodeURIComponent(q)}&cat=${encodeURIComponent(cat)}`);
  $('#view').innerHTML =
    `<div class="chips">${CATS.map((c) => `<button class="chip ${(c === 'All' ? '' : c) === cat ? 'on' : ''}" data-c="${c === 'All' ? '' : c}">${c}</button>`).join('')}</div>` +
    (apps.length ? `<div class="grid">${apps.map(card).join('')}</div>` : '<p class="muted">No apps found. Developers can publish the first one from the Developers page.</p>');
  document.querySelectorAll('.chip').forEach((b) => (b.onclick = () => { cat = b.dataset.c; home(); }));
}

async function detail(id) {
  const { app, versions, installed } = await api('apps?id=' + encodeURIComponent(id));
  const latest = versions[0];
  const label = !latest ? '' : installed === latest.id ? 'Reinstall' : installed ? 'Update to' : 'Install';
  $('#view').innerHTML = `<section class="hero">${tile(app)}<div>
    <h1>${esc(app.name)}</h1>
    <p class="muted">${esc(app.developer)} · ${esc(app.category)} · ${app.downloads} installs</p>
    ${latest ? `<a class="btn" id="inst" href="/api/download?versionId=${latest.id}">${label} v${esc(latest.version_name)}</a> <small>${fmt(latest.file_size)}</small>` : '<p class="muted">No release yet.</p>'}
    ${ME ? '' : '<p class="note">Log in to keep a history of the apps you install. Installing works without an account.</p>'}
    </div></section>
    <h3>About this app</h3><p class="pre">${esc(app.description || app.short_desc)}</p>
    <h3>Version history</h3>
    ${versions.map((v) => `<div class="ver"><b>v${esc(v.version_name)}</b> <small>build ${v.version_code} · ${new Date(v.created_at).toLocaleDateString()} · ${fmt(v.file_size)}</small>
      ${installed === v.id ? ' <span class="tag">installed</span>' : ''}
      <p class="pre">${esc(v.changelog || 'No release notes.')}</p>
      <a class="link" href="/api/download?versionId=${v.id}">Download this version</a></div>`).join('')}`;
  const b = $('#inst');
  if (b) b.addEventListener('click', () => setTimeout(route, 2500));
}

async function library() {
  if (!ME) {
    $('#view').innerHTML = '<h2>My library</h2><p class="muted">Log in to see the apps you installed and get update alerts. The store works without an account.</p><button class="btn" id="go">Log in or sign up</button>';
    $('#go').onclick = authModal;
    return;
  }
  const { items } = await api('library');
  $('#view').innerHTML = '<h2>My library</h2>' + (items.length ? items.map((i) => `<div class="row-card row">
    <a href="#/app/${i.id}" style="text-decoration:none"><b>${esc(i.name)}</b><br><small>Installed v${esc(i.installed_version)} on ${new Date(i.installed_at).toLocaleDateString()}</small></a>
    <span>${i.latest_code > i.installed_code ? `<a class="btn" href="/api/download?versionId=${i.latest_id}">Update to v${esc(i.latest_version)}</a>` : '<span class="tag">up to date</span>'}
    <button class="link" data-rm="${i.id}">Remove</button></span></div>`).join('') : '<p class="muted">Nothing installed yet. Browse the store to get started.</p>');
  document.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = async () => { await api('library?appId=' + b.dataset.rm, { method: 'DELETE' }); library(); }));
}

async function route() {
  const h = location.hash.replace(/^#\/?/, '');
  document.querySelectorAll('nav a[data-r]').forEach((a) => a.classList.toggle('on', a.dataset.r === h.split('/')[0]));
  try {
    if (h.startsWith('app/')) await detail(h.slice(4));
    else if (h === 'library') await library();
    else await home();
  } catch (e) { $('#view').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}

let t;
$('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { if (location.hash && location.hash !== '#/') location.hash = '#/'; else route(); }, 300); });
addEventListener('hashchange', route);
loadMe().then(route);
