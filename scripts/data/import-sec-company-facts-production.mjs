import pg from "pg";
import { createSecEdgarProvider, SEC_COMPANIES, SEC_DATASET_ID, SEC_SOURCE_ID } from "../../src/lib/data-platform/providers/sec-edgar.mjs";
import { parseProductionApprovalArgs } from "../db/production-operation.mjs";
import { validateFinancialProductionContext } from "../db/financial-production-safety.mjs";

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

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DB_IMPORT_URL, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000, options: "-c statement_timeout=15000 -c application_name=woori_sec_company_facts_import" });
const scope = { companies: SEC_COMPANIES.map(({ ticker, cik }) => ({ ticker, cik })), sourceId: SEC_SOURCE_ID, datasetId: SEC_DATASET_ID };

async function recordFailure(category, errorMessage) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`insert into data_collection_runs (dataset_id,started_at,finished_at,status,scope,error_category,error_message)
      values ($1,now(),now(),'failed',$2::jsonb,$3,$4)`, [SEC_DATASET_ID, JSON.stringify(scope), category.slice(0, 80), errorMessage.slice(0, 2000)]);
    await client.query("commit");
  } catch {
    await client.query("rollback").catch(() => {});
  } finally { client.release(); }
}

let snapshot;
try {
  const provider = createSecEdgarProvider({ userAgent: process.env.SEC_EDGAR_USER_AGENT });
  snapshot = await provider.collect(SEC_COMPANIES);
  const factCount = snapshot.reduce((sum, item) => sum + item.facts.length, 0);
  if (snapshot.length !== SEC_COMPANIES.length || factCount === 0 || snapshot.some((item) => !item.company.name || item.facts.length === 0)) throw new Error("SEC response did not contain complete non-empty data for all configured companies.");
  if (options.dryRun) {
    console.log(JSON.stringify({ target: targets.DB_IMPORT_URL.database, dryRun: true, companies: snapshot.length, facts: factCount, tickers: snapshot.map(({ company }) => company.ticker) }));
    process.exit(0);
  }

  const client = await pool.connect();
  let runId;
  try {
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
    if (!role.public_schema_usage) throw new Error("SEC Import role lacks USAGE on the public schema.");
    if (!role.source_select || !role.dataset_select) throw new Error("Import role lacks read access to the approved SEC source catalog.");
    for (const [prefix, requireSelect] of [["company", true], ["facts", true], ["runs", false]]) {
      const allowed = prefix === "runs" ? ["select", "insert", "update"] : ["select", "insert", "update"];
      for (const action of ["select", "insert", "update", "delete"]) {
        if (Boolean(role[`${prefix}_${action}`]) !== allowed.includes(action)) throw new Error(`Import role privileges on ${prefix} do not match the allowlist.`);
      }
      if (requireSelect && !role[`${prefix}_select`]) throw new Error(`Import role lacks SELECT on ${prefix}.`);
    }
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('woori-home:sec-company-facts-import'))");
    const { rows: [source] } = await client.query("select license_status from data_sources where id=$1 for share", [SEC_SOURCE_ID]);
    if (!source || source.license_status !== "verified") throw new Error("SEC provider license gate is not verified.");
    const { rows: [dataset] } = await client.query("select id from datasets where id=$1 and source_id=$2", [SEC_DATASET_ID, SEC_SOURCE_ID]);
    if (!dataset) throw new Error("SEC Company Facts dataset is missing; apply and verify the approved migrations first.");
    const { rows: [run] } = await client.query(`insert into data_collection_runs (dataset_id,started_at,status,scope)
      values ($1,now(),'partial',$2::jsonb) returning id`, [SEC_DATASET_ID, JSON.stringify(scope)]);
    runId = run.id;
    let insertedFacts = 0;
    let updatedFacts = 0;
    let savedFacts = 0;
    for (const item of snapshot) {
      const { rows: [company] } = await client.query(`insert into financial_companies
        (source_id,provider_company_id,cik,ticker,name,exchange,country_code,source_url,updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,now())
        on conflict (source_id,cik) do update set provider_company_id=excluded.provider_company_id,ticker=excluded.ticker,
          name=excluded.name,exchange=excluded.exchange,country_code=excluded.country_code,source_url=excluded.source_url,updated_at=now()
        returning id`, [SEC_SOURCE_ID, item.company.providerCompanyId, item.company.cik, item.company.ticker, item.company.name, item.company.exchange, item.company.countryCode, item.company.sourceUrl]);
      for (const fact of item.facts) {
        const result = await client.query(`insert into financial_company_facts
          (company_id,source_id,dataset_id,taxonomy,concept,unit,value,period_key,fiscal_year,fiscal_period,start_date,end_date,filed_date,form,accession_number,source_url,fetched_at)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
          on conflict (company_id,taxonomy,concept,unit,end_date,accession_number,period_key) do update set
            value=excluded.value,fiscal_year=excluded.fiscal_year,fiscal_period=excluded.fiscal_period,start_date=excluded.start_date,
            filed_date=excluded.filed_date,form=excluded.form,source_url=excluded.source_url,fetched_at=excluded.fetched_at
          returning (xmax=0) as inserted`, [company.id, SEC_SOURCE_ID, SEC_DATASET_ID, fact.taxonomy, fact.concept, fact.unit, fact.value, fact.periodKey, fact.fiscalYear, fact.fiscalPeriod, fact.startDate, fact.endDate, fact.filedDate, fact.form, fact.accessionNumber, fact.sourceUrl, fact.fetchedAt]);
        savedFacts += result.rowCount;
        if (result.rows[0]?.inserted) insertedFacts += 1;
        else updatedFacts += 1;
      }
    }
    if (savedFacts !== snapshot.reduce((sum, item) => sum + item.facts.length, 0)) throw new Error("Persisted SEC fact count did not match the collected snapshot.");
    await client.query(`update data_collection_runs set finished_at=now(),status='success',record_count=$2,inserted_count=$3,updated_count=$4,
      latest_reference_period=(select max(end_date) from financial_company_facts where source_id=$5) where id=$1`, [runId, savedFacts, insertedFacts, updatedFacts, SEC_SOURCE_ID]);
    await client.query("commit");
    console.log(JSON.stringify({ result: "imported", companies: snapshot.length, facts: savedFacts, insertedFacts, updatedFacts, tickers: snapshot.map(({ company }) => company.ticker) }));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally { client.release(); }
} catch (error) {
  const message = error instanceof Error ? error.message : "SEC collection failed.";
  const failureCategory = error && typeof error === "object" && typeof error.code === "string" ? error.code : "sec-import-failed";
  await recordFailure(failureCategory, message);
  console.error(JSON.stringify({ result: "failed", target: "production", error: failureCategory, message }));
  process.exitCode = 1;
} finally {
  await pool.end();
}
