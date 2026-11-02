window.AUTH_ROLE = 'developer';
const CATS = ['Games', 'Tools', 'Productivity', 'Social', 'Education', 'Entertainment', 'Other'];
window.onAuth = () => boot();

// Files go straight from the browser to Vercel Blob; /api/upload only hands out a token to developers.
async function blobUpload(file, folder) {
  const { upload } = await import('https://esm.sh/@vercel/blob@0.27.3/client');
  const b = await upload(`${folder}/${file.name}`, file, { access: 'public', handleUploadUrl: '/api/upload' });
  return b.url;
}

function gate(msg) {
  $('#view').innerHTML = `<h1>Publish on Raw Machines</h1><p class="muted">${msg}</p>${ME ? '' : '<button class="btn" id="go">Developer log in or sign up</button>'}`;
  const g = $('#go'); if (g) g.onclick = authModal;
}

async function dash() {
  const { apps } = await api('apps?mine=1');
  $('#view').innerHTML = `<div class="row"><h2>Your apps</h2><button class="btn" id="new">New app</button></div><div id="slot"></div>` +
    (apps.length ? apps.map((a) => `<div class="row-card"><div class="row"><div><b>${esc(a.name)}</b><br><small>${esc(a.category)} · ${a.version_count} version(s)${a.latest_version ? ', latest v' + esc(a.latest_version) : ''} · ${a.downloads} installs</small></div>
      <span><button class="btn alt" data-v="${a.id}">Upload version</button> <a class="link" href="/#/app/${a.id}" target="_blank">Open in store</a></span></div><div id="vs${a.id}"></div></div>`).join('')
      : '<p class="muted">You have no apps yet. Create one, then upload its first version so it appears in the store.</p>');
  $('#new').onclick = newAppForm;
  document.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => versionForm(b.dataset.v)));
}

function newAppForm() {
  $('#slot').innerHTML = `<form class="form" id="nf"><h3>New app</h3>
    <label>App name</label><input name="name" required maxlength="80">
    <label>Short description (max 140)</label><input name="shortDesc" required maxlength="140">
    <label>Full description</label><textarea name="description" maxlength="4000"></textarea>
    <label>Category</label><select name="category">${CATS.map((c) => `<option>${c}</option>`).join('')}</select>
    <label>Icon image (optional)</label><input name="icon" type="file" accept="image/*">
    <p class="err" id="fe"></p><button class="btn" id="fb">Create app</button></form>`;
  $('#nf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; $('#fb').disabled = true; $('#fb').textContent = 'Saving…';
    try {
      const icon = f.icon.files[0];
      const iconUrl = icon ? await blobUpload(icon, 'icons') : null;
      await api('apps', { method: 'POST', body: { name: f.name.value, shortDesc: f.shortDesc.value, description: f.description.value, category: f.category.value, iconUrl } });
      dash();
    } catch (err) { $('#fe').textContent = err.message; $('#fb').disabled = false; $('#fb').textContent = 'Create app'; }
  };
}

function versionForm(appId) {
  const s = $('#vs' + appId);
  s.innerHTML = `<form class="form" id="vf"><h3>Upload version</h3>
    <label>Version name (e.g. 1.2.0)</label><input name="vn" required maxlength="40">
    <label>Build number (whole number, higher than the last one)</label><input name="vc" type="number" min="1" step="1" required>
    <label>What changed</label><textarea name="log" maxlength="2000"></textarea>
    <label>App file (APK, ZIP, installer…)</label><input name="file" type="file" required>
    <p class="err" id="fe"></p><button class="btn" id="fb">Publish version</button></form>`;
  $('#vf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; $('#fb').disabled = true; $('#fb').textContent = 'Uploading…';
    try {
      const file = f.file.files[0];
      const fileUrl = await blobUpload(file, 'apps/' + appId);
      await api('apps?action=version', { method: 'POST', body: { appId, versionName: f.vn.value, versionCode: f.vc.value, changelog: f.log.value, fileUrl, fileSize: file.size } });
      dash();
    } catch (err) { $('#fe').textContent = err.message; $('#fb').disabled = false; $('#fb').textContent = 'Publish version'; }
  };
}

function boot() {
  if (!ME) return gate('Create a developer account or log in to upload apps. Regular store accounts cannot publish.');
  if (ME.role !== 'developer') return gate('This account is a regular store account. Log out and sign up with a different email as a developer.');
  dash().catch((e) => ($('#view').innerHTML = `<p class="err">${esc(e.message)}</p>`));
}
loadMe().then(boot);
