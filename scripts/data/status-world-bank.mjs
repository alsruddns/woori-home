import "../db/load-env.mjs";
import pg from "pg";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";

const { Pool } = pg;
let target;
try {
  target = resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DATABASE_URL });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database configuration is invalid.");
  process.exit(1);
}
const pool = new Pool({ connectionString: target.url, max: 1, connectionTimeoutMillis: 4000, idleTimeoutMillis: 10000, allowExitOnIdle: true });
try {
  const [catalog, recentRuns] = await Promise.all([
    pool.query(`select
      (select count(*)::int from countries where exists (select 1 from indicator_observations o where o.country_iso3=countries.iso3)) as countries,
      (select count(distinct i.id)::int from indicators i join indicator_observations o on o.indicator_id=i.id where i.dataset_id='world-development-indicators') as indicators,
      (select count(*)::int from indicator_observations o join indicators i on i.id=o.indicator_id where i.dataset_id='world-development-indicators') as observations,
      (select max(reference_year)::int from indicator_observations o join indicators i on i.id=o.indicator_id where i.dataset_id='world-development-indicators') as latest_year`),
    pool.query(`select status, started_at, finished_at, record_count, inserted_count, updated_count, skipped_count, latest_reference_period, error_category
      from data_collection_runs where dataset_id='world-development-indicators' order by started_at desc limit 5`),
  ]);
  const row = catalog.rows[0];
  console.log(`Development database (${target.database}) World Bank status:`);
  console.log(`  Countries and aggregate areas: ${row.countries}`);
  console.log(`  Indicators: ${row.indicators}`);
  console.log(`  Observations: ${row.observations}`);
  console.log(`  Latest reference year: ${row.latest_year ?? "none"}`);
  console.log("  Recent collection runs:");
  if (!recentRuns.rows.length) console.log("    none");
  for (const run of recentRuns.rows) {
    console.log(`    ${run.status} ${run.started_at.toISOString()} rows=${run.record_count ?? 0} inserted=${run.inserted_count} updated=${run.updated_count} skipped=${run.skipped_count} latest=${run.latest_reference_period ?? "none"}${run.error_category ? ` error=${run.error_category}` : ""}`);
  }
} catch (error) {
  console.error(`Could not read World Bank development data status for ${target.database}: ${error instanceof Error ? error.message : "Unknown database error."}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
