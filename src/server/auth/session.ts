import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db/client";
import { hashSessionToken, newOpaqueSessionToken } from "../crypto/session";

export type Role = "admin" | "operator" | "viewer";
export type CurrentUser = { id: string; email: string; name: string; role: Role };

function cookieName() { return process.env.SESSION_COOKIE_NAME || "sixcore_remote_session"; }
function ttlSeconds() { const v = Number(process.env.SESSION_TTL_SECONDS || 28800); return Number.isInteger(v) && v > 0 ? v : 28800; }

export async function createSession(userId: string, ip: string | null, userAgent: string | null) {
  const token = newOpaqueSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + ttlSeconds() * 1000);
  await db().query(`INSERT INTO auth_sessions(user_id,token_hash,ip_address,user_agent,expires_at) VALUES($1,$2,$3,$4,$5)`, [userId, tokenHash, ip, userAgent, expiresAt]);
  const jar = await cookies();
  jar.set(cookieName(), token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: expiresAt });
}

export async function currentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(cookieName())?.value;
  if (!token) return null;
  const result = await db().query<CurrentUser>(`SELECT u.id,u.email,u.name,u.role FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.active=true AND u.deleted_at IS NULL LIMIT 1`, [hashSessionToken(token)]);
  return result.rows[0] ?? null;
}

export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) { redirect("/login"); throw new Error("unreachable"); }
  if (roles && !roles.includes(user.role)) { redirect("/dashboard?forbidden=1"); throw new Error("unreachable"); }
  return user;
}

export async function revokeCurrentSession() {
  const jar = await cookies();
  const token = jar.get(cookieName())?.value;
  if (token) await db().query(`UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL`, [hashSessionToken(token)]);
  jar.delete(cookieName());
}

export async function revokeAllSessions(userId: string, clearCurrentCookie = true) {
  await db().query(`UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL`, [userId]);
  if (clearCurrentCookie) (await cookies()).delete(cookieName());
}
