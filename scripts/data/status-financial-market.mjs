import "../db/load-env.mjs";
import pg from "pg";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";
import { SEC_TARGETS } from "../../src/lib/data-platform/providers/sec-edgar.mjs";

let target;
try { target = resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DATABASE_URL }); }
catch (error) { console.error(error instanceof Error ? error.message : "Database configuration is invalid."); process.exit(1); }

const pool = new pg.Pool({ connectionString: target.url, max: 1, connectionTimeoutMillis: 4000, idleTimeoutMillis: 10000, allowExitOnIdle: true });
try {
  const { rows: counts } = await pool.query(`
    select a.asset_type, count(distinct a.id)::int as assets, count(p.asset_id)::int as observations,
           max(p.reference_date) as latest_date,
           count(distinct a.id) filter (where s.license_status='verified')::int as verified_assets
    from financial_assets a
    join data_sources s on s.id=a.source_id
    left join financial_daily_prices p on p.asset_id=a.id and p.source_id=a.source_id
    group by a.asset_type order by a.asset_type`);
  console.log(`Local development financial data status (${target.database})`);
  if (!counts.length) console.log("No financial assets or daily price observations are stored.");
  else console.table(counts);
  const { rows: [total] } = await pool.query("select count(*)::int as observations from financial_daily_prices");
  const { rows: [fundamentals] } = await pool.query(`select count(distinct c.id)::int as companies,count(f.company_id)::int as facts,
    max(f.end_date) as latest_period,max(f.filed_date) as latest_filed_date
    from financial_companies c join data_sources s on s.id=c.source_id and s.license_status='verified'
    left join financial_company_facts f on f.company_id=c.id and f.source_id=c.source_id
    where c.source_id='sec-edgar-companyfacts' and c.ticker=any($1::text[])`, [SEC_TARGETS.map(({ ticker }) => ticker)]);
  const { rows: [sources] } = await pool.query(`select count(distinct s.id) filter (where s.license_status='verified' and a.id is not null)::int as approved_price_sources,
    count(*) filter (where s.id='sec-edgar-companyfacts' and s.license_status='verified')::int as sec_approved
    from data_sources s left join financial_assets a on a.source_id=s.id`);
  console.log(JSON.stringify({ marketPriceObservations: total.observations, approvedPriceSources: sources.approved_price_sources, secPublicFilingsApproved: sources.sec_approved === 1, secCompanies: fundamentals.companies, secFinancialFacts: fundamentals.facts, latestFiscalPeriod: fundamentals.latest_period, latestFiledDate: fundamentals.latest_filed_date }));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Financial data status query failed.");
  process.exitCode = 1;
} finally { await pool.end(); }
