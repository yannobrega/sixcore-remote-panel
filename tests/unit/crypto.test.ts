import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../../src/server/crypto/password.ts";
import { hashSessionToken, newOpaqueSessionToken } from "../../src/server/crypto/session.ts";

test("passwords are salted and verifiable with scrypt", async () => {
  const a = await hashPassword("a-strong-test-password");
  const b = await hashPassword("a-strong-test-password");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("a-strong-test-password", a), true);
  assert.equal(await verifyPassword("wrong-password-value", a), false);
});

test("opaque session tokens are random and stored as sha256 hashes", () => {
  const token = newOpaqueSessionToken();
  assert.ok(token.length >= 40);
  assert.match(hashSessionToken(token), /^[a-f0-9]{64}$/);
  assert.notEqual(token, hashSessionToken(token));
});
