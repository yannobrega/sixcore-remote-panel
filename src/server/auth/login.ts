import { db } from "../db/client";
import { verifyPassword } from "../crypto/password";

export function normalizeEmail(value: string) { return value.trim().toLowerCase(); }

export async function loginState(email: string, ip: string) {
  const max = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
  const lockout = Number(process.env.LOGIN_LOCKOUT_SECONDS || 900);
  const r = await db().query<{ count: string }>(`SELECT count(*)::text AS count FROM login_attempts WHERE email=$1 AND ip_address=$2 AND successful=false AND attempted_at > now() - ($3::int * interval '1 second')`, [email, ip, lockout]);
  return { locked: Number(r.rows[0]?.count || 0) >= max, max, lockout };
}

export async function authenticate(emailInput: string, password: string, ip: string) {
  const email = normalizeEmail(emailInput);
  const state = await loginState(email, ip);
  if (state.locked) return { ok: false as const, reason: "locked" as const };
  const r = await db().query<{ id:string; email:string; name:string; role:"admin"|"operator"|"viewer"; password_hash:string }>(`SELECT id,email,name,role,password_hash FROM users WHERE lower(email)=lower($1) AND active=true AND deleted_at IS NULL LIMIT 1`, [email]);
  const user = r.rows[0];
  const valid = user ? await verifyPassword(password, user.password_hash) : false;
  await db().query(`INSERT INTO login_attempts(email,ip_address,successful) VALUES($1,$2,$3)`, [email, ip, valid]);
  if (!valid) return { ok: false as const, reason: "invalid" as const };
  await db().query(`DELETE FROM login_attempts WHERE email=$1 AND ip_address=$2 AND successful=false`, [email, ip]);
  return { ok: true as const, user };
}
