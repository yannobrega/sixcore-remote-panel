import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) throw new Error("password_too_short");
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, KEY_LENGTH, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })) as Buffer;
  return `scrypt$32768$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, n, r, p, saltEncoded, hashEncoded] = stored.split("$");
  if (kind !== "scrypt" || !n || !r || !p || !saltEncoded || !hashEncoded) return false;
  const salt = Buffer.from(saltEncoded, "base64url");
  const expected = Buffer.from(hashEncoded, "base64url");
  const actual = (await scrypt(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 })) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
