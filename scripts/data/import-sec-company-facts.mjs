import "../db/load-env.mjs";
import pg from "pg";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";
import { createSecEdgarProvider, SEC_COMPANIES, SEC_DATASET_ID, SEC_SOURCE_ID } from "../../src/lib/data-platform/providers/sec-edgar.mjs";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || process.env.SEC_EDGAR_DRY_RUN === "true";
let target;
try { target = resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DATABASE_URL }); }
catch (error) { console.error(error.message); process.exit(1); }

const provider = createSecEdgarProvider();
const snapshot = await provider.collect(SEC_COMPANIES);
const factCount = snapshot.reduce((sum, item) => sum + item.facts.length, 0);
console.log(JSON.stringify({ target: target.target, companies: snapshot.length, facts: factCount, dryRun }));
if (dryRun) process.exit(0);

const pool = new pg.Pool({ connectionString: target.url, max: 2, connectionTimeoutMillis: 4000, options: "-c statement_timeout=10000 -c application_name=woori_sec_company_facts_import" });
const client = await pool.connect();
try {
  await client.query("begin");
  const { rows: [source] } = await client.query("select license_status from data_sources where id=$1 for share", [SEC_SOURCE_ID]);
  if (!source || source.license_status !== "verified") throw new Error("SEC provider license gate is not verified.");
  const { rows: [dataset] } = await client.query("select id from datasets where id=$1 and source_id=$2", [SEC_DATASET_ID, SEC_SOURCE_ID]);
  if (!dataset) throw new Error("SEC company-facts dataset is missing; apply the development migration first.");
  const { rows: [run] } = await client.query(`insert into data_collection_runs (dataset_id,started_at,status,scope)
    values ($1,now(),'partial',$2::jsonb) returning id`, [SEC_DATASET_ID, JSON.stringify({ companyCount: snapshot.length })]);
  let companyCount = 0;
  let factCountSaved = 0;
  let insertedFacts = 0;
  let updatedFacts = 0;
  for (const item of snapshot) {
    const company = item.company;
    const { rows: [saved] } = await client.query(`insert into financial_companies (source_id,provider_company_id,cik,ticker,name,exchange,country_code,source_url,updated_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,now())
      on conflict (source_id,cik) do update set provider_company_id=excluded.provider_company_id,ticker=excluded.ticker,name=excluded.name,exchange=excluded.exchange,country_code=excluded.country_code,source_url=excluded.source_url,updated_at=now()
      returning id`, [SEC_SOURCE_ID, company.providerCompanyId, company.cik, company.ticker, company.name, company.exchange, company.countryCode, company.sourceUrl]);
    companyCount += 1;
    for (const fact of item.facts) {
      const result = await client.query(`insert into financial_company_facts
        (company_id,source_id,dataset_id,taxonomy,concept,unit,value,period_key,fiscal_year,fiscal_period,start_date,end_date,filed_date,form,accession_number,source_url,fetched_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        on conflict (company_id,taxonomy,concept,unit,end_date,accession_number,period_key) do update set
          value=excluded.value,fiscal_year=excluded.fiscal_year,fiscal_period=excluded.fiscal_period,start_date=excluded.start_date,
          filed_date=excluded.filed_date,form=excluded.form,source_url=excluded.source_url,fetched_at=excluded.fetched_at
        returning (xmax=0) as inserted`,
      [saved.id, SEC_SOURCE_ID, SEC_DATASET_ID, fact.taxonomy, fact.concept, fact.unit, fact.value, fact.periodKey, fact.fiscalYear, fact.fiscalPeriod, fact.startDate, fact.endDate, fact.filedDate, fact.form, fact.accessionNumber, fact.sourceUrl, fact.fetchedAt]);
      if (result.rowCount) {
        factCountSaved += 1;
        if (result.rows[0].inserted) insertedFacts += 1;
        else updatedFacts += 1;
      }
    }
  }
  await client.query(`update data_collection_runs set finished_at=now(),status='success',record_count=$2,inserted_count=$3,updated_count=$4,
    latest_reference_period=(select max(end_date) from financial_company_facts where source_id=$5) where id=$1`, [run.id, factCountSaved, insertedFacts, updatedFacts, SEC_SOURCE_ID]);
  await client.query("commit");
  console.log(JSON.stringify({ result: "imported", companies: companyCount, facts: factCountSaved, insertedFacts, updatedFacts }));
} catch (error) {
  await client.query("rollback");
  console.error(`SEC company-facts import failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
