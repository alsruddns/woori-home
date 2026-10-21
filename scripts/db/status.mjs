import "./load-env.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { resolveDatabaseTarget } from "./connection-safety.mjs";
import { pendingMigrations } from "./migration-status.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let target;
try {
  target = resolveDatabaseTarget({ requireProductionApproval: true });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database configuration is invalid.");
  process.exit(1);
}
const journal = JSON.parse(await readFile(path.join(root, "drizzle/meta/_journal.json"), "utf8"));
const pool = new Pool({ connectionString: target.url, max: 1, connectionTimeoutMillis: 4000, allowExitOnIdle: true });

try {
  const result = await pool.query("select to_regclass('drizzle.__drizzle_migrations') as table_name");
  if (!result.rows[0]?.table_name) {
    console.log(`${target.target} database (${target.database}): 0 applied, ${journal.entries.length} pending.`);
  } else {
    const applied = await pool.query("select created_at from drizzle.__drizzle_migrations order by created_at asc");
    const pending = pendingMigrations(journal.entries, applied.rows);
    console.log(`${target.target} database (${target.database}): ${applied.rows.length} applied, ${pending.length} pending.`);
    for (const entry of pending) console.log(`PENDING ${entry.tag}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown database status error.";
  console.error(`Could not read migration status for ${target.target} database (${target.database}): ${message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
