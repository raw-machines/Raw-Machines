import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

export const sql = neon(process.env.DATABASE_URL);
const SECRET = process.env.JWT_SECRET;

export function getUser(req) {
  const m = (req.headers.cookie || '').match(/(?:^|; )rm_token=([^;]+)/);
  if (!m || !SECRET) return null;
  try { return jwt.verify(m[1], SECRET); } catch { return null; }
}
export function setSession(res, u) {
  const t = jwt.sign({ id: u.id, name: u.name, role: u.role }, SECRET, { expiresIn: '30d' });
  res.setHeader('Set-Cookie', `rm_token=${t}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000`);
}
export function clearSession(res) {
  res.setHeader('Set-Cookie', 'rm_token=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0');
}
export const toInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : NaN; };
export const isHttps = (s) => typeof s === 'string' && /^https:\/\//.test(s);
