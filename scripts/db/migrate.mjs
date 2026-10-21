import "./load-env.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { assertNoDestructiveMigration, resolveDatabaseTarget } from "./connection-safety.mjs";
import { pendingMigrations } from "./migration-status.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsFolder = path.join(root, "drizzle");
let target;
try {
  target = resolveDatabaseTarget({ requireProductionApproval: true });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database configuration is invalid.");
  process.exit(1);
}
const journal = JSON.parse(await readFile(path.join(migrationsFolder, "meta/_journal.json"), "utf8"));

const pool = new Pool({
  connectionString: target.url,
  max: 2,
  connectionTimeoutMillis: 4000,
  idleTimeoutMillis: 10000,
  allowExitOnIdle: true,
});

let lockClient;
try {
  lockClient = await pool.connect();
  await lockClient.query("select pg_advisory_lock(hashtext('woori-home:drizzle-migrations'))");
  const exists = await pool.query("select to_regclass('drizzle.__drizzle_migrations') as table_name");
  const applied = exists.rows[0]?.table_name
    ? await pool.query("select created_at from drizzle.__drizzle_migrations")
    : { rows: [] };
  for (const migration of pendingMigrations(journal.entries, applied.rows)) {
    const sql = await readFile(path.join(migrationsFolder, `${migration.tag}.sql`), "utf8");
    try {
      assertNoDestructiveMigration(sql, `${migration.tag}.sql`);
    } catch (error) {
      if (process.env.DB_MIGRATION_ALLOW_DESTRUCTIVE_SQL !== "I_REVIEWED_THIS_MIGRATION") throw error;
      console.warn(`Explicitly reviewed destructive SQL is being applied from ${migration.tag}.sql.`);
    }
  }
  await migrate(drizzle({ client: pool }), { migrationsFolder });
  console.log(`Migrations applied successfully to the explicitly selected ${target.target} database (${target.database}).`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown database migration error.";
  console.error(`Migration failed for ${target.target} database (${target.database}): ${message}`);
  process.exitCode = 1;
} finally {
  if (lockClient) {
    try { await lockClient.query("select pg_advisory_unlock(hashtext('woori-home:drizzle-migrations'))"); }
    catch { /* Preserve the original migration result. Closing the connection releases the lock. */ }
    lockClient.release();
  }
  await pool.end();
}
