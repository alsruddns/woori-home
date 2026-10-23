import "../db/load-env.mjs";
import pg from "pg";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";
import { collectChangedSecCompanies, loadExistingSecCompanyState, persistSecCompanyFacts } from "./sec-company-facts-core.mjs";
import { createSecEdgarProvider, SEC_DATASET_ID, SEC_SOURCE_ID } from "../../src/lib/data-platform/providers/sec-edgar.mjs";

const dryRun = new Set(process.argv.slice(2)).has("--dry-run") || process.env.SEC_EDGAR_DRY_RUN === "true";
let target;
try { target = resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DATABASE_URL }); }
catch (error) { console.error(error.message); process.exit(1); }

const pool = new pg.Pool({ connectionString: target.url, max: 1, connectionTimeoutMillis: 4000, options: "-c statement_timeout=30000 -c application_name=woori_sec_company_facts_import" });
try {
  const provider = createSecEdgarProvider();
  const companies = await provider.resolveCompanies();
  const client = await pool.connect();
  try {
    await client.query("begin read only");
    const source = await client.query("select license_status from data_sources where id=$1", [SEC_SOURCE_ID]);
    const dataset = await client.query("select id from datasets where id=$1 and source_id=$2", [SEC_DATASET_ID, SEC_SOURCE_ID]);
    if (source.rows[0]?.license_status !== "verified" || !dataset.rowCount) throw new Error("SEC source and dataset must be reviewed and present before collection.");
    const existing = await loadExistingSecCompanyState(client, SEC_SOURCE_ID);
    await client.query("commit");
    const collected = await collectChangedSecCompanies(provider, companies, existing);
    const factCount = collected.updated.reduce((sum, item) => sum + item.facts.length, 0);
    console.log(JSON.stringify({ target: target.target, dryRun, targetCompanies: companies.length, changedCompanies: collected.updated.length, unchangedCompanies: collected.unchanged.length, failedCompanies: collected.failed, facts: factCount }));
    if (collected.failed.length) process.exitCode = 1;
    if (dryRun || (!collected.updated.length && !collected.unchanged.length)) {
      if (!collected.failed.length) process.exitCode = 0;
    } else {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext('woori-home:sec-company-facts-import'))");
      const { rows: [run] } = await client.query(`insert into data_collection_runs (dataset_id,started_at,status,scope)
      values ($1,now(),'partial',$2::jsonb) returning id`, [SEC_DATASET_ID, JSON.stringify({ targetCompanies: companies.length, changedTickers: collected.updated.map((item) => item.company.ticker), unchangedTickers: collected.unchanged.map((item) => item.company.ticker), failed: collected.failed.map(({ ticker, code }) => ({ ticker, code })) })]);
      const saved = await persistSecCompanyFacts(client, collected, { sourceId: SEC_SOURCE_ID, datasetId: SEC_DATASET_ID });
      const status = collected.failed.length ? "partial" : "success";
      const latestError = collected.failed[0] ?? null;
      await client.query(`update data_collection_runs set finished_at=now(),status=$2,record_count=$3,inserted_count=$4,updated_count=$5,
      latest_reference_period=(select max(end_date) from financial_company_facts where source_id=$6),error_category=$7,error_message=$8 where id=$1`,
      [run.id, status, saved.facts, saved.insertedFacts, saved.updatedFacts, SEC_SOURCE_ID, latestError?.code ?? null, latestError?.error ?? null]);
      await client.query("commit");
      console.log(JSON.stringify({ result: status, ...saved, skippedUnchanged: collected.unchanged.length, failed: collected.failed }));
      if (collected.failed.length) process.exitCode = 1;
    }
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally { client.release(); }
} catch (error) {
  console.error(`SEC development collection failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
} finally { await pool.end(); }
