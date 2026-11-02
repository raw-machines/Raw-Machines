import { sql, getUser, toInt } from './_lib.js';

export default async function handler(req, res) {
  try {
    const u = getUser(req);
    if (!u) return res.status(401).json({ error: 'Log in to see your library.' });
    if (req.method === 'DELETE') {
      const appId = toInt(req.query.appId);
      if (isNaN(appId)) return res.status(400).json({ error: 'Bad app id.' });
      await sql`delete from installs where user_id = ${u.id} and app_id = ${appId}`;
      return res.json({ ok: true });
    }
    const items = await sql`
      select a.id, a.name, a.icon_url, a.category, i.installed_at,
        iv.version_name as installed_version, iv.version_code as installed_code,
        lv.id as latest_id, lv.version_name as latest_version, lv.version_code as latest_code
      from installs i
      join apps a on a.id = i.app_id
      join versions iv on iv.id = i.version_id
      left join lateral (select id, version_name, version_code from versions where app_id = a.id order by version_code desc limit 1) lv on true
      where i.user_id = ${u.id}
      order by i.installed_at desc`;
    return res.json({ items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error.' });
  }
}
