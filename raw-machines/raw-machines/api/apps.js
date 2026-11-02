import { sql, getUser, toInt, isHttps } from './_lib.js';

const CATS = ['Games', 'Tools', 'Productivity', 'Social', 'Education', 'Entertainment', 'Other'];

export default async function handler(req, res) {
  try {
    const u = getUser(req);

    if (req.method === 'GET') {
      const { id, mine } = req.query;
      const q = String(req.query.q || '').slice(0, 80);
      const cat = String(req.query.cat || '');

      if (mine) {
        if (!u || u.role !== 'developer') return res.status(403).json({ error: 'Developer login required.' });
        const apps = await sql`
          select a.id, a.name, a.short_desc, a.category, a.icon_url, a.downloads,
            (select count(*)::int from versions v where v.app_id = a.id) as version_count,
            (select version_name from versions v where v.app_id = a.id order by version_code desc limit 1) as latest_version
          from apps a where a.developer_id = ${u.id} order by a.id desc`;
        return res.json({ apps });
      }
      if (id) {
        const n = toInt(id);
        if (isNaN(n)) return res.status(400).json({ error: 'Bad id.' });
        const [app] = await sql`
          select a.id, a.name, a.short_desc, a.description, a.category, a.icon_url, a.downloads, a.updated_at, d.name as developer
          from apps a join users d on d.id = a.developer_id where a.id = ${n}`;
        if (!app) return res.status(404).json({ error: 'App not found.' });
        const versions = await sql`
          select id, version_name, version_code, changelog, file_size, created_at
          from versions where app_id = ${n} order by version_code desc`;
        let installed = null;
        if (u) {
          const r = await sql`select version_id from installs where user_id = ${u.id} and app_id = ${n}`;
          installed = r[0] ? r[0].version_id : null;
        }
        return res.json({ app, versions, installed });
      }
      const like = '%' + q + '%';
      const apps = await sql`
        select a.id, a.name, a.short_desc, a.category, a.icon_url, a.downloads, d.name as developer,
          (select version_name from versions v where v.app_id = a.id order by version_code desc limit 1) as latest_version
        from apps a join users d on d.id = a.developer_id
        where exists (select 1 from versions v where v.app_id = a.id)
          and (${q} = '' or a.name ilike ${like})
          and (${cat} = '' or a.category = ${cat})
        order by a.downloads desc, a.id desc limit 60`;
      return res.json({ apps });
    }

    if (req.method === 'POST') {
      if (!u || u.role !== 'developer') return res.status(403).json({ error: 'Developer login required.' });
      const b = req.body || {};

      if (req.query.action === 'version') {
        const appId = toInt(b.appId), code = toInt(b.versionCode);
        const vName = String(b.versionName || '').trim().slice(0, 40);
        if (isNaN(appId) || isNaN(code) || code < 1 || !vName || !isHttps(b.fileUrl))
          return res.status(400).json({ error: 'Version name, a positive version code and an uploaded file are required.' });
        const own = await sql`select id from apps where id = ${appId} and developer_id = ${u.id}`;
        if (!own.length) return res.status(403).json({ error: 'You do not own this app.' });
        try {
          const [v] = await sql`
            insert into versions (app_id, version_name, version_code, changelog, file_url, file_size)
            values (${appId}, ${vName}, ${code}, ${String(b.changelog || '').slice(0, 2000)}, ${b.fileUrl}, ${Math.max(0, Number(b.fileSize) || 0)})
            returning id`;
          await sql`update apps set updated_at = now() where id = ${appId}`;
          return res.json({ id: v.id });
        } catch (e) {
          if (e.code === '23505') return res.status(409).json({ error: 'That version code already exists for this app. Use a higher number.' });
          throw e;
        }
      }

      const name = String(b.name || '').trim().slice(0, 80);
      const shortDesc = String(b.shortDesc || '').trim().slice(0, 140);
      if (!name || !shortDesc) return res.status(400).json({ error: 'App name and short description are required.' });
      const cat = CATS.includes(b.category) ? b.category : 'Other';
      const icon = isHttps(b.iconUrl) ? b.iconUrl : null;
      const [a] = await sql`
        insert into apps (developer_id, name, short_desc, description, category, icon_url)
        values (${u.id}, ${name}, ${shortDesc}, ${String(b.description || '').slice(0, 4000)}, ${cat}, ${icon})
        returning id`;
      return res.json({ id: a.id });
    }
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error.' });
  }
}
