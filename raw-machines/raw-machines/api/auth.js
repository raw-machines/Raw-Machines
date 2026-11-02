import bcrypt from 'bcryptjs';
import { sql, getUser, setSession, clearSession } from './_lib.js';

export default async function handler(req, res) {
  const a = req.query.action;
  try {
    if (a === 'me') {
      const s = getUser(req);
      return res.json({ user: s ? { id: s.id, name: s.name, role: s.role } : null });
    }
    if (a === 'logout') { clearSession(res); return res.json({ ok: true }); }
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email.' });

    if (a === 'register') {
      const name = String(b.name || '').trim().slice(0, 60);
      if (!name) return res.status(400).json({ error: 'Enter your name.' });
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      const role = b.role === 'developer' ? 'developer' : 'user';
      if ((await sql`select id from users where email = ${email}`).length)
        return res.status(409).json({ error: 'An account with this email already exists.' });
      const hash = await bcrypt.hash(password, 10);
      const [u] = await sql`insert into users (email, name, password_hash, role) values (${email}, ${name}, ${hash}, ${role}) returning id, name, role`;
      setSession(res, u);
      return res.json({ user: u });
    }
    if (a === 'login') {
      const [u] = await sql`select id, name, role, password_hash from users where email = ${email}`;
      if (!u || !(await bcrypt.compare(password, u.password_hash)))
        return res.status(401).json({ error: 'Wrong email or password.' });
      setSession(res, u);
      return res.json({ user: { id: u.id, name: u.name, role: u.role } });
    }
    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error.' });
  }
}
