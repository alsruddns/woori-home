import "../db/load-env.mjs";
import pg from "pg";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";

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
  console.log(`Total observations: ${total.observations}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Financial data status query failed.");
  process.exitCode = 1;
} finally { await pool.end(); }
