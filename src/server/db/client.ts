import pg from "pg";

const { Pool } = pg;
let pool: pg.Pool | undefined;

export function db(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required at runtime");
  if (!pool) pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
  return pool;
}
