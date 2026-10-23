import pg from "pg";
import { validateFinancialProductionContext, safeDatabaseErrorCode } from "../db/financial-production-safety.mjs";
import { SEC_TARGETS, SEC_DATASET_ID, SEC_SOURCE_ID } from "../../src/lib/data-platform/providers/sec-edgar.mjs";

const command = process.argv[2];
if (!new Set(["status", "verify"]).has(command) || process.argv.length !== 3) {
  console.error("Usage: node scripts/data/financial-sec-production.mjs <status|verify>");
  process.exit(2);
}

let targets;
try { targets = validateFinancialProductionContext(); }
catch (error) { console.error(error instanceof Error ? error.message : "Production SEC verification guard failed."); process.exit(1); }

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000, options: "-c default_transaction_read_only=on -c statement_timeout=10000 -c application_name=woori_sec_production_readonly" });
try {
  const identity = await pool.query("select current_database() as database_name,current_user as role_name");
  if (identity.rows[0]?.database_name !== targets.DATABASE_URL.database || identity.rows[0]?.role_name !== "woori_portal") throw new Error("Runtime identity did not match the production read-only role.");
  const tableState = await pool.query(`select table_name from information_schema.tables where table_schema='public' and table_name=any($1::text[])`, [["financial_companies", "financial_company_facts"]]);
  const found = new Set(tableState.rows.map((row) => row.table_name));
  if (found.size !== 2) {
    const report = { command, target: targets.DATABASE_URL.database, schemaReady: false, tablesPresent: [...found].sort(), companies: 0, facts: 0 };
    console.log(JSON.stringify(report));
    if (command === "verify") process.exitCode = 2;
    process.exit();
  }
  const { rows: [source] } = await pool.query("select license_status from data_sources where id=$1", [SEC_SOURCE_ID]);
  const { rows: [dataset] } = await pool.query("select source_id from datasets where id=$1", [SEC_DATASET_ID]);
  const { rows: [summary] } = await pool.query(`select count(distinct c.cik)::int as companies,count(f.company_id)::int as facts,
      count(*) filter(where f.unit <> 'USD')::int as non_usd_facts,
      count(*) filter(where f.source_id <> $1 or f.dataset_id <> $2)::int as wrong_provenance,
      max(f.end_date) as latest_period,max(f.filed_date) as latest_filed_date
    from financial_companies c left join financial_company_facts f on f.company_id=c.id and f.source_id=c.source_id
    where c.source_id=$1`, [SEC_SOURCE_ID, SEC_DATASET_ID]);
  const companyRows = await pool.query(`select ticker,count(f.company_id)::int as facts from financial_companies c
    left join financial_company_facts f on f.company_id=c.id and f.source_id=c.source_id
    where c.source_id=$1 and c.ticker=any($2::text[]) group by ticker order by ticker`, [SEC_SOURCE_ID, SEC_TARGETS.map(({ ticker }) => ticker)]);
  const duplicates = await pool.query(`select count(*)::int as duplicate_groups from (
    select company_id,taxonomy,concept,unit,end_date,accession_number,period_key,count(*)
    from financial_company_facts where source_id=$1 group by 1,2,3,4,5,6,7 having count(*)>1) d`, [SEC_SOURCE_ID]);
  const report = {
    command,
    target: targets.DATABASE_URL.database,
    schemaReady: true,
    sourceApproved: source?.license_status === "verified",
    datasetLinked: dataset?.source_id === SEC_SOURCE_ID,
    ...summary,
    expectedCompanies: SEC_TARGETS.map(({ ticker }) => ticker).sort(),
    companyRows: companyRows.rows,
    duplicateGroups: duplicates.rows[0].duplicate_groups,
  };
  console.log(JSON.stringify(report, null, 2));
  if (command === "verify") {
    const present = new Set(companyRows.rows.map(({ ticker }) => ticker));
    const expected = report.expectedCompanies;
    if (!report.sourceApproved || !report.datasetLinked || present.size !== expected.length || expected.some((ticker) => !present.has(ticker)
      || Number(companyRows.rows.find((row) => row.ticker === ticker)?.facts) === 0)
      || Number(summary.facts) === 0 || Number(summary.non_usd_facts) !== 0 || Number(summary.wrong_provenance) !== 0
      || Number(duplicates.rows[0].duplicate_groups) !== 0) process.exitCode = 2;
  }
} catch (error) {
  console.error(JSON.stringify({ command, target: "production", error: safeDatabaseErrorCode(error), message: error instanceof Error && !("code" in error) ? error.message : "SEC production read-only check failed." }));
  process.exitCode = 1;
} finally {
  await pool.end();
}
