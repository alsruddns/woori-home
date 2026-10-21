import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { classifyMigrationTestState, EXPECTED_MIGRATION_TAGS, MigrationTestSafetyError, parseMigrationTestTarget, verifyMigrationTestSchema } from "./migration-test-safety.mjs";

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsFolder = path.join(root, "drizzle");
const phase = { current: "configuration" };
let pool;
let lockClient;

try {
  const target = parseMigrationTestTarget(process.env.MIGRATION_TEST_DATABASE_URL);
  const journal = JSON.parse(await readFile(path.join(migrationsFolder, "meta/_journal.json"), "utf8"));
  if (journal.entries.length !== EXPECTED_MIGRATION_TAGS.length
    || journal.entries.some((entry, index) => entry.tag !== EXPECTED_MIGRATION_TAGS[index])) {
    throw new MigrationTestSafetyError("The migration journal is not the expected 0000–0003 test set.");
  }

  const connectionUrl = new URL(target.url);
  pool = new Pool({
    host: target.host,
    port: 5432,
    database: target.database,
    user: decodeURIComponent(connectionUrl.username),
    password: decodeURIComponent(connectionUrl.password),
    max: 2,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 1000,
    allowExitOnIdle: true,
  });
  phase.current = "connection";
  lockClient = await pool.connect();
  const identity = await lockClient.query("select current_database() as database_name, current_user as role_name, current_setting('server_version_num') as server_version_num");
  const expectedUser = decodeURIComponent(new URL(target.url).username);
  const actual = identity.rows[0];
  if (actual?.database_name !== "woori_migration_test"
    || actual?.role_name.toLowerCase() !== expectedUser.toLowerCase()
    || !String(actual?.server_version_num ?? "").startsWith("16")) {
    throw new MigrationTestSafetyError("Connected PostgreSQL identity is not the expected isolated PostgreSQL 16 test database.");
  }

  phase.current = "state-check";
  await lockClient.query("select pg_advisory_lock(hashtext('woori-home:test-database-migrations'))");
  const [tableResult, schemaResult, otherSchemaResult, migrationTableResult, appliedResult] = await Promise.all([
    pool.query("select tablename from pg_catalog.pg_tables where schemaname = 'public' order by tablename"),
    pool.query("select exists(select 1 from pg_catalog.pg_namespace where nspname = 'drizzle') as exists"),
    pool.query("select nspname from pg_catalog.pg_namespace where nspname not in ('public', 'drizzle', 'information_schema') and nspname not like 'pg_%' order by nspname"),
    pool.query("select to_regclass('drizzle.__drizzle_migrations') as table_name"),
    pool.query("select created_at::text as created_at from drizzle.__drizzle_migrations order by created_at asc").catch((error) => {
      if (error && typeof error === "object" && "code" in error && error.code === "42P01") return { rows: [] };
      throw error;
    }),
  ]);
  const publicTables = tableResult.rows.map((row) => row.tablename);
  const migrationSchemaExists = schemaResult.rows[0].exists;
  const migrationTableExists = Boolean(migrationTableResult.rows[0].table_name);
  const beforeState = classifyMigrationTestState({
    publicTables,
    migrationSchemaExists,
    otherSchemas: otherSchemaResult.rows.map((row) => row.nspname),
    migrationTableExists,
    appliedRows: appliedResult.rows,
    migrationTimes: journal.entries.map((entry) => entry.when),
  });

  phase.current = "migration";
  await migrate(drizzle({ client: pool }), { migrationsFolder });
  const firstAppliedResult = await pool.query("select created_at::text as created_at from drizzle.__drizzle_migrations order by created_at asc");
  if (firstAppliedResult.rows.length !== journal.entries.length) throw new MigrationTestSafetyError("The first migration pass did not apply exactly four entries.");

  phase.current = "idempotence";
  await migrate(drizzle({ client: pool }), { migrationsFolder });

  phase.current = "schema-verification";
  const [finalHistory, finalTables, finalIndexes] = await Promise.all([
    pool.query("select created_at::text as created_at from drizzle.__drizzle_migrations order by created_at asc"),
    pool.query("select tablename from pg_catalog.pg_tables where schemaname = 'public' order by tablename"),
    pool.query("select indexname from pg_catalog.pg_indexes where schemaname = 'public' order by indexname"),
  ]);
  const verified = verifyMigrationTestSchema({
    appliedRows: finalHistory.rows,
    migrationTimes: journal.entries.map((entry) => entry.when),
    tables: finalTables.rows.map((row) => row.tablename),
    indexes: finalIndexes.rows.map((row) => row.indexname),
  });

  console.log(`Isolated migration test passed (${beforeState} database): ${verified.applied} applied / ${verified.pending} pending after a second migration run.`);
  console.log(`Schema verified: ${verified.tables} public tables and ${verified.indexes} public indexes; PostgreSQL 16.`);
} catch (error) {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? ` (${error.code})` : "";
  const safeMessage = error instanceof MigrationTestSafetyError ? error.message : "Database operation failed; connection details were suppressed.";
  console.error(`Isolated migration test failed during ${phase.current}${code}: ${safeMessage}`);
  process.exitCode = 1;
} finally {
  if (lockClient) {
    try { await lockClient.query("select pg_advisory_unlock(hashtext('woori-home:test-database-migrations'))"); } catch { /* Closing the session releases the lock. */ }
    lockClient.release();
  }
  if (pool) await pool.end();
}
