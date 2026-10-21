import "../db/load-env.mjs";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";

const target = resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DATABASE_URL });
const pool = new pg.Pool({ connectionString: target.url, max: 1, connectionTimeoutMillis: 4000, idleTimeoutMillis: 10000, allowExitOnIdle: true });
const sourceId = `financial-db-check-${randomUUID()}`;
const datasetId = `${sourceId}-prices`;
let client;
try {
  client = await pool.connect();
  await client.query("begin");
  await client.query(`insert into data_sources (id,name,provider,source_url,license_status,rights_note)
    values ($1,'Temporary financial DB verification','local test','https://example.invalid','unknown','Transaction-only test fixture; not approved for public display')`, [sourceId]);
  await client.query(`insert into datasets (id,source_id,name,category,reference_period_kind,source_url)
    values ($1,$2,'Temporary financial DB verification','test','daily','https://example.invalid')`, [datasetId, sourceId]);
  const { rows: [asset] } = await client.query(`insert into financial_assets
    (source_id,source_asset_id,asset_type,symbol,name,venue,currency,unit,timezone)
    values ($1,'fixture:TEST','stock','TEST','Temporary verification fixture','test','USD','share','America/New_York') returning id`, [sourceId]);
  const key = [asset.id, sourceId, "2026-10-20", "close"];
  await client.query(`insert into financial_daily_prices
    (asset_id,source_id,dataset_id,reference_date,reference_timezone,price_kind,close,volume,fetched_at)
    values ($1,$2,$3,$4,'America/New_York',$5,'123.1234567891','0',now())
    on conflict (asset_id,source_id,reference_date,price_kind) do update set close=excluded.close`, [asset.id, sourceId, datasetId, "2026-10-20", "close"]);
  await client.query(`insert into financial_daily_prices
    (asset_id,source_id,dataset_id,reference_date,reference_timezone,price_kind,close,volume,fetched_at)
    values ($1,$2,$3,$4,'America/New_York',$5,'123.1234567892','0',now())
    on conflict (asset_id,source_id,reference_date,price_kind) do update set close=excluded.close`, [asset.id, sourceId, datasetId, "2026-10-20", "close"]);
  const { rows: [price] } = await client.query(`select close::text as close, volume::text as volume from financial_daily_prices
    where asset_id=$1 and source_id=$2 and reference_date=$3 and price_kind=$4`, key);
  if (price.close !== "123.1234567892" || price.volume !== "0.0000000000") throw new Error("NUMERIC precision or UPSERT verification failed.");
  const stale = await client.query(`insert into financial_daily_prices
    (asset_id,source_id,dataset_id,reference_date,reference_timezone,price_kind,close,volume,fetched_at)
    values ($1,$2,$3,$4,'America/New_York',$5,'1','0',now() - interval '1 day')
    on conflict (asset_id,source_id,reference_date,price_kind) do update set close=excluded.close,fetched_at=excluded.fetched_at
    where coalesce(excluded.source_updated_at,excluded.fetched_at) >= coalesce(financial_daily_prices.source_updated_at,financial_daily_prices.fetched_at)
    returning close::text as close`, [asset.id, sourceId, datasetId, "2026-10-20", "close"]);
  if (stale.rowCount !== 0) throw new Error("An older provider snapshot overwrote newer stored data.");
  const { rows: [afterStaleAttempt] } = await client.query(`select close::text as close from financial_daily_prices
    where asset_id=$1 and source_id=$2 and reference_date=$3 and price_kind=$4`, key);
  if (afterStaleAttempt.close !== "123.1234567892") throw new Error("A stale snapshot changed the stored financial price.");
  await client.query("savepoint financial_fk_check");
  let foreignKeyRejected = false;
  try {
    await client.query(`insert into financial_assets (source_id,source_asset_id,asset_type,symbol,name,currency,unit,timezone)
      values ('missing-financial-source','fixture:BAD','stock','BAD','Invalid FK fixture','USD','share','UTC')`);
  } catch (error) {
    if (error?.code !== "23503") throw error;
    foreignKeyRejected = true;
    await client.query("rollback to savepoint financial_fk_check");
  }
  if (!foreignKeyRejected) throw new Error("Financial asset foreign-key constraint was not enforced.");
  console.log("Financial DB INSERT / SELECT / precision / conflict UPSERT passed inside a rollback transaction.");
  console.log("Financial DB stale provider snapshot was rejected inside the rollback transaction.");
  console.log("Financial DB foreign-key rejection passed.");
  await client.query("rollback");
  client.release();
  client = null;
  const { rows: [remaining] } = await pool.query("select count(*)::int as rows from data_sources where id=$1", [sourceId]);
  if (remaining.rows !== 0) throw new Error("Rollback did not remove verification rows.");
  console.log("Financial DB ROLLBACK passed; no test fixture rows remain.");
} catch (error) {
  if (client) await client.query("rollback").catch(() => {});
  console.error(error instanceof Error ? error.message : "Financial DB verification failed.");
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
