import { sql, getUser, toInt } from './_lib.js';

// Every install goes through here: counts the download, records history for logged-in users, then sends the file.
export default async function handler(req, res) {
  try {
    const id = toInt(req.query.versionId);
    if (isNaN(id)) return res.status(400).json({ error: 'Bad version id.' });
    const [v] = await sql`select id, app_id, file_url from versions where id = ${id}`;
    if (!v) return res.status(404).json({ error: 'Version not found.' });
    await sql`update apps set downloads = downloads + 1 where id = ${v.app_id}`;
    const u = getUser(req);
    if (u) {
      await sql`
        insert into installs (user_id, app_id, version_id) values (${u.id}, ${v.app_id}, ${v.id})
        on conflict (user_id, app_id) do update set version_id = excluded.version_id, installed_at = now()`;
    }
    res.statusCode = 302;
    res.setHeader('Location', v.file_url);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
}
