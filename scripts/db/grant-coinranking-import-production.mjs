import pg from "pg";
import { parseProductionApprovalArgs } from "./production-operation.mjs";
import { validateFinancialProductionContext, quotePgIdentifier, safeDatabaseErrorCode } from "./financial-production-safety.mjs";

let options;
let targets;
try {
  options = parseProductionApprovalArgs(process.argv.slice(2), { requireBackup: true });
  if (!options.apply) throw new Error("Coinranking Import grants require --apply and a verified backup reference.");
  targets = validateFinancialProductionContext({ requireBackup: true, backupReference: options.backupReference });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Coinranking Import grant guard failed.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DB_MIGRATION_URL, max: 1, connectionTimeoutMillis: 5000,
  options: "-c statement_timeout=10000 -c application_name=woori_coinranking_import_grants" });
const writeTables = ["financial_assets", "financial_daily_prices", "data_collection_runs"];
try {
  const identity = await pool.query(`select current_database() as database_name,current_user as role_name,
      (select rolsuper from pg_roles where rolname=current_user) as superuser,
      (select rolsuper from pg_roles where rolname='woori_portal_import') as import_superuser,
      (select rolcreatedb from pg_roles where rolname='woori_portal_import') as import_createdb,
      (select rolcreaterole from pg_roles where rolname='woori_portal_import') as import_createrole,
      has_database_privilege('woori_portal_import',current_database(),'CREATE') as import_database_create,
      has_schema_privilege('woori_portal_import','public','CREATE') as import_schema_create`);
  const row = identity.rows[0];
  if (row?.database_name !== targets.DB_MIGRATION_URL.database || row?.role_name !== "woori_portal_migration") throw new Error("Migration role identity did not match the production target.");
  if (row.superuser || row.import_superuser || row.import_createdb || row.import_createrole || row.import_database_create || row.import_schema_create) throw new Error("Import or Migration role has elevated cluster privileges.");
  const before = await pool.query(`select table_name,
      has_table_privilege('woori_portal_import',format('public.%I',table_name),'DELETE') as can_delete,
      has_table_privilege('woori_portal_import',format('public.%I',table_name),'TRUNCATE') as can_truncate
    from unnest($1::text[]) as tables(table_name)`, [writeTables]);
  if (before.rows.some((grant) => grant.can_delete || grant.can_truncate)) throw new Error("Import role has destructive privileges on a Coinranking target table; refusing to grant access.");
  const role = quotePgIdentifier("woori_portal_import");
  await pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await pool.query(`GRANT SELECT ON TABLE public.data_sources,public.datasets,public.data_collection_runs,public.financial_assets,public.financial_daily_prices TO ${role}`);
  await pool.query(`GRANT INSERT,UPDATE ON TABLE public.data_collection_runs,public.financial_assets,public.financial_daily_prices TO ${role}`);
  const after = await pool.query(`select table_name,
      has_table_privilege('woori_portal_import',format('public.%I',table_name),'SELECT') as can_select,
      has_table_privilege('woori_portal_import',format('public.%I',table_name),'INSERT') as can_insert,
      has_table_privilege('woori_portal_import',format('public.%I',table_name),'UPDATE') as can_update,
      has_table_privilege('woori_portal_import',format('public.%I',table_name),'DELETE') as can_delete,
      has_table_privilege('woori_portal_import',format('public.%I',table_name),'TRUNCATE') as can_truncate
    from unnest($1::text[]) as tables(table_name)`, [writeTables]);
  if (after.rows.length !== writeTables.length || after.rows.some((grant) => !grant.can_select || !grant.can_insert || !grant.can_update || grant.can_delete || grant.can_truncate)) throw new Error("Coinranking Import grants do not match the SELECT/INSERT/UPDATE-only allowlist.");
  const catalog = await pool.query(`select table_name,has_table_privilege('woori_portal_import',format('public.%I',table_name),'SELECT') as can_select
    from unnest(array['data_sources','datasets']) as tables(table_name)`);
  if (catalog.rows.some((grant) => !grant.can_select)) throw new Error("Import role lacks read-only source catalog access.");
  console.log(JSON.stringify({ result: "coinranking-import-grants-verified", role: "woori_portal_import", writeTables, catalogReadOnly: true, grants: after.rows }));
} catch (error) {
  console.error(JSON.stringify({ result: "failed", error: safeDatabaseErrorCode(error), message: error instanceof Error && !("code" in error) ? error.message : "Coinranking Import grants were not verified." }));
  process.exitCode = 1;
} finally { await pool.end(); }
