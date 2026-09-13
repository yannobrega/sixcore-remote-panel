import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("CREDENTIAL_ENCRYPTION_KEY is required");
  let decoded: Buffer;
  try { decoded = Buffer.from(raw, "base64"); } catch { throw new Error("CREDENTIAL_ENCRYPTION_KEY must be base64"); }
  if (decoded.length !== 32) throw new Error("CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes");
  return decoded;
}

export type EncryptedCredential = { ciphertext: string; nonce: string; tag: string };

export function encryptCredential(value: string): EncryptedCredential {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), nonce);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), nonce: nonce.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

export function decryptCredential(value: EncryptedCredential): string {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(value.nonce, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export function generateDevicePassword(): string {
  return randomBytes(24).toString("base64url");
}
