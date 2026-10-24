import pg from "pg";
import { INTEGRATION_TEST_DATABASE } from "./integration-test-safety.mjs";

const { Pool } = pg;
const ADMIN_DATABASE = "postgres";
const ADMIN_HOSTS = new Set(["localhost", "127.0.0.1"]);
let pool;

function parseAdminUrl(value) {
  if (!value) throw new Error("TEST_DATABASE_ADMIN_URL is required to provision the isolated integration database.");
  let url;
  try { url = new URL(value); } catch { throw new Error("TEST_DATABASE_ADMIN_URL must be a PostgreSQL URL."); }
  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)
    || decodeURIComponent(url.pathname.replace(/^\//, "")) !== ADMIN_DATABASE
    || !ADMIN_HOSTS.has(url.hostname.toLowerCase())
    || decodeURIComponent(url.username).toLowerCase() !== "postgres"
    || (url.port && (Number(url.port) < 1 || Number(url.port) > 65535))
    || [...url.searchParams.keys()].length > 0
    || url.hash) throw new Error("Provisioning is restricted to the local PostgreSQL admin role and postgres database.");
  return url;
}

try {
  const adminUrl = parseAdminUrl(process.env.TEST_DATABASE_ADMIN_URL);
  pool = new Pool({ connectionString: adminUrl.toString(), max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000, allowExitOnIdle: true, application_name: "woori_test_db_provisioner" });
  const { rows: [identity] } = await pool.query(`select current_database() as database_name,current_user as role_name,
    current_setting('server_version_num') as version_num,(select rolsuper from pg_roles where rolname=current_user) as superuser`);
  if (identity.database_name !== ADMIN_DATABASE || identity.role_name !== "postgres" || !String(identity.version_num).startsWith("16") || !identity.superuser) {
    throw new Error("Provisioning requires the PostgreSQL 16 local admin identity.");
  }

  const { rows: [role] } = await pool.query("select rolsuper,rolcreatedb,rolcreaterole,rolcanlogin from pg_roles where rolname='woori_test'");
  if (!role) {
    const password = process.env.TEST_DATABASE_PASSWORD;
    if (!password || password.length < 16) throw new Error("TEST_DATABASE_PASSWORD must be provided by the isolated test environment.");
    const safePassword = password.replaceAll("'", "''");
    await pool.query(`create role woori_test login password '${safePassword}' nosuperuser nocreatedb nocreaterole`);
  } else if (role.rolsuper || role.rolcreatedb || role.rolcreaterole || !role.rolcanlogin) {
    throw new Error("Existing woori_test role is not a restricted login role; refusing to change its privileges.");
  }

  const { rows: [database] } = await pool.query("select pg_get_userbyid(datdba) as owner from pg_database where datname=$1", [INTEGRATION_TEST_DATABASE]);
  if (!database) await pool.query(`create database ${INTEGRATION_TEST_DATABASE} owner woori_test`);
  else if (database.owner !== "woori_test") throw new Error("Existing integration test database is not owned by woori_test; refusing to change it.");
  console.log(`Restricted integration-test role and database are ready: ${INTEGRATION_TEST_DATABASE}.`);
} catch (error) {
  console.error(`Integration database provisioning failed: ${error instanceof Error ? error.message : "Database operation failed; connection details were suppressed."}`);
  process.exitCode = 1;
} finally { await pool?.end(); }
