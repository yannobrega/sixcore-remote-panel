import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required at runtime");
const migrationsDir = path.resolve(process.cwd(), "migrations");
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const files = (await fs.readdir(migrationsDir)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
  for (const file of files) {
    const version = file.split("_")[0];
    const seen = await client.query("SELECT 1 FROM schema_migrations WHERE version=$1", [version]);
    if (seen.rowCount) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(version) VALUES($1)", [version]);
      await client.query("COMMIT");
      console.log(JSON.stringify({ level: "info", event: "migration_applied", version }));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally { await client.end(); }
