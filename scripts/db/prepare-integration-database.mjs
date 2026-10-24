import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { IntegrationTestSafetyError, parseIntegrationTestTarget } from "./integration-test-safety.mjs";
import { EXPECTED_TABLES } from "./migration-test-safety.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsFolder = path.join(root, "drizzle");
const phase = { current: "configuration" };
const { Pool } = pg;
let pool;
let client;

try {
  const target = parseIntegrationTestTarget(process.env.TEST_DATABASE_URL);
  const journal = JSON.parse(await readFile(path.join(migrationsFolder, "meta/_journal.json"), "utf8"));
  pool = new Pool({ connectionString: target.url, max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000, allowExitOnIdle: true, application_name: "woori_portal_integration_test" });
  phase.current = "identity-check";
  client = await pool.connect();
  const identity = await client.query(`select current_database() as database_name,current_user as role_name,current_setting('server_version_num') as version_num,
    (select rolsuper from pg_roles where rolname=current_user) as superuser,
    (select rolcreatedb from pg_roles where rolname=current_user) as create_database,
    (select rolcreaterole from pg_roles where rolname=current_user) as create_role`);
  const row = identity.rows[0];
  if (row.database_name !== target.database || row.role_name !== "woori_test" || !String(row.version_num).startsWith("16")
    || row.superuser || row.create_database || row.create_role) {
    throw new IntegrationTestSafetyError("Connected database identity must be woori_today_portal_test / woori_test on PostgreSQL 16.");
  }
  phase.current = "state-check";
  const schemas = await client.query("select nspname from pg_catalog.pg_namespace where nspname not in ('public','drizzle','information_schema') and nspname not like 'pg_%'");
  if (schemas.rowCount) throw new IntegrationTestSafetyError("Test database has unexpected schemas; refusing to migrate it.");
  const historyExists = (await client.query("select to_regclass('drizzle.__drizzle_migrations') as name")).rows[0].name;
  const publicTables = await client.query("select tablename from pg_catalog.pg_tables where schemaname='public'");
  const tableNames = publicTables.rows.map(({ tablename }) => tablename);
  const hasExpectedTables = tableNames.length === EXPECTED_TABLES.length && EXPECTED_TABLES.every((table) => tableNames.includes(table));
  const history = historyExists
    ? await client.query("select created_at::text as created_at from drizzle.__drizzle_migrations order by created_at")
    : { rows: [] };
  const allowedTimes = new Set(journal.entries.map((entry) => String(entry.when)));
  const empty = !historyExists && publicTables.rowCount === 0;
  const complete = historyExists && history.rows.length === journal.entries.length
    && new Set(history.rows.map((item) => item.created_at)).size === journal.entries.length
    && history.rows.every((item) => allowedTimes.has(item.created_at))
    && hasExpectedTables;
  if (!empty && !complete) throw new IntegrationTestSafetyError("Test database must be empty or carry the complete current migration history; refusing to change it.");
  client.release();
  client = undefined;

  phase.current = "migration";
  await migrate(drizzle({ client: pool }), { migrationsFolder });
  const [applied, migratedTables] = await Promise.all([
    pool.query("select created_at::text as created_at from drizzle.__drizzle_migrations order by created_at"),
    pool.query("select tablename from pg_catalog.pg_tables where schemaname='public'"),
  ]);
  const migratedNames = migratedTables.rows.map(({ tablename }) => tablename);
  if (applied.rows.length !== journal.entries.length || new Set(applied.rows.map((item) => item.created_at)).size !== journal.entries.length
    || migratedNames.length !== EXPECTED_TABLES.length || EXPECTED_TABLES.some((table) => !migratedNames.includes(table))) {
    throw new IntegrationTestSafetyError("Test migration did not produce the complete expected schema.");
  }
  phase.current = "fixture";
  const fixture = await pool.connect();
  try {
    await fixture.query("begin");
    await fixture.query(`insert into data_sources (id,name,provider,source_url,license_status)
      values ('world-bank','World Bank test fixture','World Bank','https://data.worldbank.org/','verified')
      on conflict (id) do nothing`);
    await fixture.query(`insert into datasets (id,source_id,name,category,reference_period_kind,source_url)
      values ('world-development-indicators','world-bank','World Development Indicators test fixture','economic','year','https://data.worldbank.org/')
      on conflict (id) do nothing`);
    await fixture.query(`insert into indicators (id,dataset_id,code,localized_names,definition,unit,frequency)
      values ('SL.UEM.TOTL.ZS','world-development-indicators','SL.UEM.TOTL.ZS','{}'::jsonb,'{}'::jsonb,'%','annual')
      on conflict (id) do nothing`);
    await fixture.query(`insert into countries (iso3,iso2,world_bank_code,localized_names,is_aggregate)
      values ('KOR','KR','KOR','{"en":"Korea"}'::jsonb,false)
      on conflict (iso3) do nothing`);
    await fixture.query(`insert into indicator_observations (indicator_id,country_iso3,reference_year,value,last_checked_at,last_updated_at)
      values ('SL.UEM.TOTL.ZS','KOR',2025,2.5,now(),now())
      on conflict (indicator_id,country_iso3,reference_year) do nothing`);
    await fixture.query("commit");
  } catch (error) {
    await fixture.query("rollback").catch(() => {});
    throw error;
  } finally { fixture.release(); }
  console.log(`Integration-test database prepared: ${target.database}; PostgreSQL 16; ${journal.entries.length} migrations; fixture seeded.`);
} catch (error) {
  const code = error && typeof error === "object" && "code" in error ? ` (${error.code})` : "";
  console.error(`Database integration setup failed during ${phase.current}${code}: ${error instanceof IntegrationTestSafetyError ? error.message : "Database operation failed; connection details were suppressed."}`);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool?.end();
}
