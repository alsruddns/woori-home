import "../db/load-env.mjs";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";
import { validateMarketPriceRecord } from "../../src/lib/data-platform/financial-market.mjs";

const options = { dryRun: false, file: null };
for (const arg of process.argv.slice(2)) {
  if (arg === "--dry-run") { options.dryRun = true; continue; }
  const match = arg.match(/^--file=(.+)$/);
  if (match && !options.file) { options.file = match[1]; continue; }
  throw new Error("Usage: pnpm data:financial:import -- --file=reviewed-export.json [--dry-run]");
}
if (!options.file) throw new Error("A reviewed export file is required via --file=.");

const target = resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DATABASE_URL });
const filePath = path.resolve(options.file);
const content = await readFile(filePath);
const checksum = createHash("sha256").update(content).digest("hex");
let input;
try { input = JSON.parse(content.toString("utf8")); }
catch { throw new Error("Import file is not valid JSON."); }
if (input?.schemaVersion !== 1 || !input.sourceId || !input.datasetId || !Array.isArray(input.assets) || !Array.isArray(input.prices)) throw new Error("Import file must contain schemaVersion 1, sourceId, datasetId, assets, and prices.");
if (!input.assets.length || !input.prices.length) throw new Error("Import file must contain assets and observations; empty imports are refused.");
const sourceAssetIds = new Set();
for (const asset of input.assets) {
  if (!asset || typeof asset.sourceAssetId !== "string" || !asset.sourceAssetId.trim() || sourceAssetIds.has(asset.sourceAssetId)) throw new Error("Asset identifiers must be present and unique within the import.");
  sourceAssetIds.add(asset.sourceAssetId);
  if (!/^(stock|crypto|metal|energy|agriculture|fx|rate|index)$/.test(asset.assetType) || !asset.symbol || !asset.name || !/^[A-Z]{3}$/.test(asset.currency) || !asset.unit || !asset.timezone) throw new Error(`Invalid asset metadata for ${asset.sourceAssetId}.`);
}
const uniquePriceKeys = new Set();
for (const price of input.prices) {
  if (!sourceAssetIds.has(price.sourceAssetId)) throw new Error(`Unknown sourceAssetId in prices: ${price.sourceAssetId}.`);
  const result = validateMarketPriceRecord({ ...price, assetId: price.sourceAssetId, sourceId: input.sourceId, datasetId: input.datasetId });
  if (!result.ok) throw new Error(`Invalid price record (${price.sourceAssetId}, ${price.referenceDate}): ${result.reason}.`);
  const key = `${price.sourceAssetId}\u0000${price.referenceDate}\u0000${price.priceKind}`;
  if (uniquePriceKeys.has(key)) throw new Error(`Duplicate price row in import: ${price.sourceAssetId} ${price.referenceDate} ${price.priceKind}.`);
  uniquePriceKeys.add(key);
}

const pool = new pg.Pool({ connectionString: target.url, max: 1, connectionTimeoutMillis: 4000, idleTimeoutMillis: 10000, allowExitOnIdle: true });
const runId = randomUUID();
try {
  const { rows: [source] } = await pool.query(`select id,license_status,attribution,source_url from data_sources where id=$1`, [input.sourceId]);
  if (!source || source.license_status !== "verified" || !source.attribution || !source.source_url) throw new Error("Import is blocked: the source must exist with verified rights, attribution, and a source URL.");
  const { rows: [dataset] } = await pool.query("select id,source_id from datasets where id=$1", [input.datasetId]);
  if (!dataset || dataset.source_id !== input.sourceId) throw new Error("Import is blocked: dataset/source relationship does not match.");
  console.log(`Validated ${input.assets.length} assets and ${input.prices.length} observations (${checksum.slice(0, 12)}…).`);
  if (options.dryRun) { console.log("Dry run: no rows or collection run were written."); process.exit(0); }

  const { rows: [run] } = await pool.query(`insert into data_collection_runs
    (id,dataset_id,started_at,status,snapshot_version,checksum,record_count,scope)
    values ($1,$2,now(),'partial',$3,$4,0,$5) returning id`, [runId, input.datasetId, input.snapshotVersion ?? null, checksum, JSON.stringify({ kind: "financial-market", assetCount: input.assets.length, observationCount: input.prices.length, file: path.basename(filePath) })]);
  const assetIds = new Map();
  let inserted = 0, updated = 0, skipped = 0, completedPrices = 0;
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const asset of input.assets) {
      const { rows: [saved] } = await client.query(`insert into financial_assets
        (source_id,source_asset_id,asset_type,symbol,name,venue,country_code,currency,unit,timezone,sector,is_active,metadata,last_updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())
        on conflict (source_id,source_asset_id) do update set asset_type=excluded.asset_type,symbol=excluded.symbol,name=excluded.name,venue=excluded.venue,country_code=excluded.country_code,currency=excluded.currency,unit=excluded.unit,timezone=excluded.timezone,sector=excluded.sector,is_active=excluded.is_active,metadata=excluded.metadata,last_updated_at=now()
        returning id`, [input.sourceId, asset.sourceAssetId, asset.assetType, asset.symbol, asset.name, asset.venue ?? "global", asset.countryCode ?? null, asset.currency, asset.unit, asset.timezone, asset.sector ?? null, asset.isActive ?? true, JSON.stringify(asset.metadata ?? {})]);
      assetIds.set(asset.sourceAssetId, saved.id);
    }
    for (let offset = 0; offset < input.prices.length; offset += 250) {
      const batch = input.prices.slice(offset, offset + 250);
      for (const price of batch) {
        const { rows } = await client.query(`insert into financial_daily_prices
            (asset_id,source_id,dataset_id,reference_date,reference_timezone,price_kind,open,high,low,close,volume,market_cap,is_adjusted,fetched_at,source_updated_at,updated_at)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now())
            on conflict (asset_id,source_id,reference_date,price_kind) do update set
              dataset_id=excluded.dataset_id,reference_timezone=excluded.reference_timezone,open=excluded.open,high=excluded.high,low=excluded.low,close=excluded.close,volume=excluded.volume,market_cap=excluded.market_cap,is_adjusted=excluded.is_adjusted,fetched_at=excluded.fetched_at,source_updated_at=excluded.source_updated_at,updated_at=now()
            where coalesce(excluded.source_updated_at, excluded.fetched_at) >= coalesce(financial_daily_prices.source_updated_at, financial_daily_prices.fetched_at)
              and (financial_daily_prices.dataset_id,financial_daily_prices.reference_timezone,financial_daily_prices.open,financial_daily_prices.high,financial_daily_prices.low,financial_daily_prices.close,financial_daily_prices.volume,financial_daily_prices.market_cap,financial_daily_prices.is_adjusted,financial_daily_prices.fetched_at,financial_daily_prices.source_updated_at)
              is distinct from (excluded.dataset_id,excluded.reference_timezone,excluded.open,excluded.high,excluded.low,excluded.close,excluded.volume,excluded.market_cap,excluded.is_adjusted,excluded.fetched_at,excluded.source_updated_at)
            returning (xmax=0) as was_inserted`, [assetIds.get(price.sourceAssetId), input.sourceId, input.datasetId, price.referenceDate, price.referenceTimezone, price.priceKind, price.open ?? null, price.high ?? null, price.low ?? null, price.close, price.volume ?? null, price.marketCap ?? null, price.isAdjusted ?? false, price.fetchedAt, price.sourceUpdatedAt ?? null]);
        if (!rows.length) skipped += 1;
        else if (rows[0].was_inserted) inserted += 1;
        else updated += 1;
        completedPrices += 1;
      }
    }
    await client.query("commit");
    await pool.query(`update data_collection_runs set finished_at=now(),status=$2,record_count=$3,inserted_count=$4,updated_count=$5,skipped_count=$6,latest_reference_period=$7 where id=$1`, [run.id, inserted + updated === 0 ? "unchanged" : "success", completedPrices, inserted, updated, skipped, input.prices.map((row) => row.referenceDate).sort().at(-1)]);
    console.log(`Import complete: inserted ${inserted}, updated ${updated}, unchanged ${skipped}. Run ${run.id}.`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    await pool.query(`update data_collection_runs set finished_at=now(),status='failed',record_count=$2,inserted_count=0,updated_count=0,skipped_count=0,error_category='import-failed',error_message=$3 where id=$1`, [run.id, completedPrices, error instanceof Error ? error.message.slice(0, 2000) : "Unknown import error"]).catch(() => {});
    throw error;
  } finally { client.release(); }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Financial import failed.");
  process.exitCode = 1;
} finally { await pool.end(); }
