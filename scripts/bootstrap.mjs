import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const scrypt = promisify(scryptCallback);
const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "yan.nobrega@sixcore.com.br").trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!databaseUrl) throw new Error("DATABASE_URL is required at runtime");
if (!password) throw new Error("BOOTSTRAP_ADMIN_PASSWORD is required at runtime");
if (password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD must have at least 12 characters");
const salt = randomBytes(16);
const derived = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const passwordHash = `scrypt$32768$8$1$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  const existing = await client.query("SELECT id FROM users WHERE lower(email)=lower($1) LIMIT 1", [email]);
  if (existing.rowCount) {
    console.log(JSON.stringify({ level: "info", event: "bootstrap_admin_exists", email }));
  } else {
    await client.query("INSERT INTO users(email,name,password_hash,role,active) VALUES($1,$2,$3,'admin',true)", [email, "Yan Nóbrega", passwordHash]);
    console.log(JSON.stringify({ level: "info", event: "bootstrap_admin_created", email }));
  }
} finally { await client.end(); }
