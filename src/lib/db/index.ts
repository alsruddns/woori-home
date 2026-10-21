import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { resolveDatabaseTarget } from "../../../scripts/db/connection-safety.mjs";
import * as schema from "./schema";

const globalForDb = globalThis as typeof globalThis & { wooriDb?: ReturnType<typeof createDb> };

function createDb() {
  const target = resolveDatabaseTarget({ databaseUrl: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: target.url,
    max: 2,
    connectionTimeoutMillis: 4000,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
  });
  pool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL connection error", (error as NodeJS.ErrnoException).code ?? "unknown");
  });
  return { pool, db: drizzle({ client: pool, schema }), target: target.target };
}

export function getDatabase() {
  globalForDb.wooriDb ??= createDb();
  return globalForDb.wooriDb.db;
}

export async function closeDatabase() {
  const current = globalForDb.wooriDb;
  if (current) {
    delete globalForDb.wooriDb;
    await current.pool.end();
  }
}
