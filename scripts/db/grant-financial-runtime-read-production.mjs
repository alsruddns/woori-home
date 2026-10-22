import pg from "pg";
import { parseProductionApprovalArgs } from "./production-operation.mjs";
import { validateFinancialProductionContext, quotePgIdentifier, safeDatabaseErrorCode } from "./financial-production-safety.mjs";

let options;
let targets;
try {
  options = parseProductionApprovalArgs(process.argv.slice(2), { requireBackup: true });
  if (!options.apply) throw new Error("Runtime financial grants require --apply and a verified backup reference.");
  targets = validateFinancialProductionContext({ requireBackup: true, backupReference: options.backupReference });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Production runtime grant guard failed.");
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DB_MIGRATION_URL, max: 1, connectionTimeoutMillis: 5000, options: "-c statement_timeout=10000 -c application_name=woori_financial_runtime_grants" });
try {
  const identity = await pool.query(`select current_database() as database_name,current_user as role_name,
    (select rolsuper from pg_roles where rolname=current_user) as superuser,
    (select rolcreatedb from pg_roles where rolname=current_user) as create_database,
    (select rolcreaterole from pg_roles where rolname=current_user) as create_role`);
  if (identity.rows[0]?.database_name !== targets.DB_MIGRATION_URL.database || identity.rows[0]?.role_name !== "woori_portal_migration") throw new Error("Migration role identity did not match the validated production target.");
  if (identity.rows[0].superuser || identity.rows[0].create_database || identity.rows[0].create_role) throw new Error("Migration role has unexpected cluster-level privileges.");
  const roleChecks = await pool.query("select rolsuper,rolcreatedb,rolcreaterole from pg_roles where rolname='woori_portal'");
  if (!roleChecks.rows[0] || roleChecks.rows[0].rolsuper || roleChecks.rows[0].rolcreatedb || roleChecks.rows[0].rolcreaterole) throw new Error("Runtime role has elevated cluster privileges.");
  const schemaCreate = await pool.query("select has_schema_privilege('woori_portal','public','CREATE') as can_create");
  const databaseCreate = await pool.query("select has_database_privilege('woori_portal',current_database(),'CREATE') as can_create");
  if (schemaCreate.rows[0].can_create || databaseCreate.rows[0].can_create) throw new Error("Runtime role can create database objects.");
  const before = await pool.query(`select table_name,
      has_table_privilege('woori_portal',format('public.%I',table_name),'INSERT') as can_insert,
      has_table_privilege('woori_portal',format('public.%I',table_name),'UPDATE') as can_update,
      has_table_privilege('woori_portal',format('public.%I',table_name),'DELETE') as can_delete,
      has_table_privilege('woori_portal',format('public.%I',table_name),'TRUNCATE') as can_truncate
    from unnest(array['financial_companies','financial_company_facts']) as tables(table_name)`);
  if (before.rows.length !== 2 || before.rows.some((row) => row.can_insert || row.can_update || row.can_delete || row.can_truncate)) throw new Error("Runtime role already has write privileges; refusing to change grants.");
  const role = quotePgIdentifier("woori_portal");
  await pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await pool.query(`GRANT SELECT ON TABLE public.financial_companies, public.financial_company_facts TO ${role}`);
  const checks = await pool.query(`select table_name,
      has_table_privilege('woori_portal',format('public.%I',table_name),'SELECT') as can_select,
      has_table_privilege('woori_portal',format('public.%I',table_name),'INSERT') as can_insert,
      has_table_privilege('woori_portal',format('public.%I',table_name),'UPDATE') as can_update,
      has_table_privilege('woori_portal',format('public.%I',table_name),'DELETE') as can_delete,
      has_table_privilege('woori_portal',format('public.%I',table_name),'TRUNCATE') as can_truncate
    from unnest(array['financial_companies','financial_company_facts']) as tables(table_name)`);
  if (checks.rows.length !== 2 || checks.rows.some((row) => !row.can_select || row.can_insert || row.can_update || row.can_delete || row.can_truncate)) throw new Error("Runtime grants do not satisfy the SELECT-only policy.");
  const schemaUsage = await pool.query("select has_schema_privilege('woori_portal','public','USAGE') as can_use");
  if (!schemaUsage.rows[0].can_use) throw new Error("Runtime role lacks USAGE on the public schema.");
  console.log(JSON.stringify({ result: "runtime-select-only", role: "woori_portal", tables: checks.rows }));
} catch (error) {
  console.error(JSON.stringify({ result: "failed", error: safeDatabaseErrorCode(error), message: error instanceof Error && !("code" in error) ? error.message : "Runtime grants were not verified." }));
  process.exitCode = 1;
} finally {
  await pool.end();
}
