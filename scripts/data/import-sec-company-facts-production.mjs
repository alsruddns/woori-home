import pg from "pg";
import { collectChangedSecCompanies, loadExistingSecCompanyState, persistSecCompanyFacts } from "./sec-company-facts-core.mjs";
import { createSecEdgarProvider, SEC_DATASET_ID, SEC_SOURCE_ID } from "../../src/lib/data-platform/providers/sec-edgar.mjs";
import { parseProductionApprovalArgs } from "../db/production-operation.mjs";
import { validateFinancialProductionContext, safeDatabaseErrorCode } from "../db/financial-production-safety.mjs";

let options;
let targets;
try {
  options = parseProductionApprovalArgs(process.argv.slice(2), { requireBackup: true });
  targets = validateFinancialProductionContext({ requireBackup: options.apply, backupReference: options.backupReference });
  if (typeof process.env.SEC_EDGAR_USER_AGENT !== "string" || !/\S+\s+\S+@\S+\.\S+/.test(process.env.SEC_EDGAR_USER_AGENT)) throw new Error("SEC_EDGAR_USER_AGENT must identify Woori.today and a monitored contact email.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "SEC production import guard failed.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DB_IMPORT_URL, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000, options: "-c statement_timeout=30000 -c application_name=woori_sec_company_facts_import" });
const provider = createSecEdgarProvider({ userAgent: process.env.SEC_EDGAR_USER_AGENT });

async function assertImportRole(client) {
  const identity = await client.query(`select current_database() as database_name,current_user as role_name,
    (select rolsuper from pg_roles where rolname=current_user) as superuser,
    (select rolcreatedb from pg_roles where rolname=current_user) as create_database,
    (select rolcreaterole from pg_roles where rolname=current_user) as create_role,
    has_database_privilege(current_user,current_database(),'CREATE') as database_create,
    has_schema_privilege(current_user,'public','CREATE') as public_schema_create,
    has_schema_privilege(current_user,'public','USAGE') as public_schema_usage,
    has_table_privilege(current_user,'public.data_sources','SELECT') as source_select,
    has_table_privilege(current_user,'public.datasets','SELECT') as dataset_select,
    has_table_privilege(current_user,'public.financial_companies','SELECT') as company_select,
    has_table_privilege(current_user,'public.financial_companies','INSERT') as company_insert,
    has_table_privilege(current_user,'public.financial_companies','UPDATE') as company_update,
    has_table_privilege(current_user,'public.financial_companies','DELETE') as company_delete,
    has_table_privilege(current_user,'public.financial_company_facts','SELECT') as facts_select,
    has_table_privilege(current_user,'public.financial_company_facts','INSERT') as facts_insert,
    has_table_privilege(current_user,'public.financial_company_facts','UPDATE') as facts_update,
    has_table_privilege(current_user,'public.financial_company_facts','DELETE') as facts_delete,
    has_table_privilege(current_user,'public.data_collection_runs','SELECT') as runs_select,
    has_table_privilege(current_user,'public.data_collection_runs','INSERT') as runs_insert,
    has_table_privilege(current_user,'public.data_collection_runs','UPDATE') as runs_update,
    has_table_privilege(current_user,'public.data_collection_runs','DELETE') as runs_delete`);
  const role = identity.rows[0];
  if (role.database_name !== targets.DB_IMPORT_URL.database || role.role_name !== "woori_portal_import"
    || role.superuser || role.create_database || role.create_role || role.database_create || role.public_schema_create) throw new Error("SEC Import did not connect as the restricted production Import role.");
  if (!role.public_schema_usage || !role.source_select || !role.dataset_select) throw new Error("SEC Import role lacks required catalog access.");
  for (const prefix of ["company", "facts", "runs"]) {
    const required = ["select", "insert", "update"];
    for (const action of ["select", "insert", "update", "delete"]) {
      if (Boolean(role[`${prefix}_${action}`]) !== required.includes(action)) throw new Error(`Import role privileges on ${prefix} do not match the SELECT/INSERT/UPDATE allowlist.`);
    }
  }
}

async function recordFailure(category, message, companies = []) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`insert into data_collection_runs (dataset_id,started_at,finished_at,status,scope,error_category,error_message)
      values ($1,now(),now(),'failed',$2::jsonb,$3,$4)`, [SEC_DATASET_ID, JSON.stringify({ targetCompanies: companies.length, sourceId: SEC_SOURCE_ID, datasetId: SEC_DATASET_ID }), category.slice(0, 80), message.slice(0, 2000)]);
    await client.query("commit");
  } catch { await client.query("rollback").catch(() => {}); }
  finally { client.release(); }
}

try {
  const companies = await provider.resolveCompanies();
  const readClient = await pool.connect();
  let existing;
  try {
    await assertImportRole(readClient);
    const { rows: [source] } = await readClient.query("select license_status from data_sources where id=$1", [SEC_SOURCE_ID]);
    const { rows: [dataset] } = await readClient.query("select source_id from datasets where id=$1", [SEC_DATASET_ID]);
    if (source?.license_status !== "verified" || dataset?.source_id !== SEC_SOURCE_ID) throw new Error("SEC source and dataset must be approved and linked before production collection.");
    existing = await loadExistingSecCompanyState(readClient, SEC_SOURCE_ID);
  } finally { readClient.release(); }

  const collected = await collectChangedSecCompanies(provider, companies, existing);
  const factCount = collected.updated.reduce((sum, item) => sum + item.facts.length, 0);
  const preview = { target: targets.DB_IMPORT_URL.database, dryRun: options.dryRun, targetCompanies: companies.length, changedCompanies: collected.updated.length, unchangedCompanies: collected.unchanged.length, failedCompanies: collected.failed, facts: factCount };
  console.log(JSON.stringify(preview));
  if (options.dryRun) {
    if (collected.failed.length) process.exitCode = 1;
  } else {
    const client = await pool.connect();
    try {
      await assertImportRole(client);
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext('woori-home:sec-company-facts-import'))");
      const { rows: [source] } = await client.query("select license_status from data_sources where id=$1 for share", [SEC_SOURCE_ID]);
      if (!source || source.license_status !== "verified") throw new Error("SEC source reuse approval is not active.");
      const { rows: [run] } = await client.query(`insert into data_collection_runs (dataset_id,started_at,status,scope)
        values ($1,now(),'partial',$2::jsonb) returning id`, [SEC_DATASET_ID, JSON.stringify({ targetCompanies: companies.length, changedTickers: collected.updated.map((item) => item.company.ticker), unchangedTickers: collected.unchanged.map((item) => item.company.ticker), failed: collected.failed.map(({ ticker, code }) => ({ ticker, code })) })]);
      const saved = await persistSecCompanyFacts(client, collected, { sourceId: SEC_SOURCE_ID, datasetId: SEC_DATASET_ID });
      const status = collected.failed.length ? saved.companies ? "partial" : "failed" : "success";
      const firstFailure = collected.failed[0] ?? null;
      await client.query(`update data_collection_runs set finished_at=now(),status=$2,record_count=$3,inserted_count=$4,updated_count=$5,
        latest_reference_period=(select max(end_date) from financial_company_facts where source_id=$6),error_category=$7,error_message=$8 where id=$1`,
      [run.id, status, saved.facts, saved.insertedFacts, saved.updatedFacts, SEC_SOURCE_ID, firstFailure?.code ?? null, firstFailure?.error ?? null]);
      await client.query("commit");
      console.log(JSON.stringify({ result: status, ...saved, skippedUnchanged: collected.unchanged.length, failed: collected.failed }));
      if (collected.failed.length) process.exitCode = 1;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally { client.release(); }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "SEC collection failed.";
  const category = safeDatabaseErrorCode(error);
  await recordFailure(category, message);
  console.error(JSON.stringify({ result: "failed", target: "production", error: category, message }));
  process.exitCode = 1;
} finally { await pool.end(); }
