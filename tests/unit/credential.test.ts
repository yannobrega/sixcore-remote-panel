import test from "node:test";
import assert from "node:assert/strict";
import { encryptCredential, decryptCredential, generateDevicePassword } from "../../src/server/crypto/credential.ts";

test("AES-256-GCM encrypts and decrypts device credentials", () => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  const encrypted = encryptCredential("router-secret-123");
  assert.notEqual(encrypted.ciphertext, "router-secret-123");
  assert.equal(decryptCredential(encrypted), "router-secret-123");
});

test("generated device password is strong and non-deterministic", () => {
  const a = generateDevicePassword();
  const b = generateDevicePassword();
  assert.ok(a.length >= 32);
  assert.notEqual(a, b);
});
