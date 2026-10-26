import "../db/load-env.mjs";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";
import { upsertFinancialPrice } from "../../src/lib/data-platform/financial-price-upsert.mjs";
import { validateMarketPriceRecord } from "../../src/lib/data-platform/financial-market.mjs";
import { canCollectCryptoDailySnapshots, canCollectFinancialPrices } from "../../src/lib/data-platform/financial-rights.mjs";
import { evaluatePriceOperation } from "../../src/lib/data-platform/financial-price-policy.mjs";

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
  if (!/^(stock|crypto|metal|energy|agriculture|fx|rate|index)$/.test(asset.assetType) || !asset.symbol || !asset.name || !/^[A-Z]{3,8}$/.test(asset.currency) || !asset.unit || !asset.timezone) throw new Error(`Invalid asset metadata for ${asset.sourceAssetId}.`);
}
const uniquePriceKeys = new Set();
const cryptoReferenceDates = new Set();
const cryptoAssets = new Map(input.assets.filter((asset) => asset.assetType === "crypto").map((asset) => [asset.sourceAssetId, asset]));
for (const price of input.prices) {
  if (!sourceAssetIds.has(price.sourceAssetId)) throw new Error(`Unknown sourceAssetId in prices: ${price.sourceAssetId}.`);
  const result = validateMarketPriceRecord({ ...price, assetId: price.sourceAssetId, sourceId: input.sourceId, datasetId: input.datasetId });
  if (!result.ok) throw new Error(`Invalid price record (${price.sourceAssetId}, ${price.referenceDate}): ${result.reason}.`);
  const key = `${price.sourceAssetId}\u0000${price.referenceDate}\u0000${price.priceKind}`;
  if (uniquePriceKeys.has(key)) throw new Error(`Duplicate price row in import: ${price.sourceAssetId} ${price.referenceDate} ${price.priceKind}.`);
  if (cryptoAssets.size) {
    const asset = cryptoAssets.get(price.sourceAssetId);
    if (!asset || input.assets.some((item) => item.assetType !== "crypto") || price.priceKind !== "close" || price.referenceTimezone !== asset.timezone) {
      throw new Error("Crypto imports accept only exchange-specific daily close rows matching the asset timezone.");
    }
    cryptoReferenceDates.add(price.referenceDate);
  }
  uniquePriceKeys.add(key);
}
if (cryptoAssets.size && cryptoReferenceDates.size !== 1) throw new Error("Crypto daily imports must contain one finalized reference date per run.");

const pool = new pg.Pool({ connectionString: target.url, max: 1, connectionTimeoutMillis: 4000, idleTimeoutMillis: 10000, allowExitOnIdle: true });
const runId = randomUUID();
try {
  const { rows: [source] } = await pool.query(`select id,license_status,financial_rights,terms_version,reviewed_at,review_due_at,collection_enabled,attribution,source_url from data_sources where id=$1`, [input.sourceId]);
  if (!source || !source.attribution || !source.source_url) throw new Error("Import is blocked: the source must exist with attribution and a source URL.");
  const hasCryptoAssets = input.assets.some((asset) => asset.assetType === "crypto");
  if (hasCryptoAssets ? !canCollectCryptoDailySnapshots(source) : !canCollectFinancialPrices(source)) {
    throw new Error("Import is blocked: database storage and long-term retention must be confirmed, current, and individually enabled.");
  }
  if (input.assets.some((asset) => asset.assetType === "metal") && !evaluatePriceOperation(source,"collect").allowed) {
    throw new Error("Metal import requires current commercial, storage and daily-observation permission evidence.");
  }
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
    const { rows: [currentSource] } = await client.query(`select id,license_status,financial_rights,terms_version,reviewed_at,review_due_at,collection_enabled,attribution,source_url from data_sources where id=$1 for share`,[input.sourceId]);
    if (hasCryptoAssets ? !canCollectCryptoDailySnapshots(currentSource) : !canCollectFinancialPrices(currentSource)) throw new Error("Financial source rights changed before persistence.");
    if (input.assets.some((asset)=>asset.assetType==="metal") && !evaluatePriceOperation(currentSource,"collect").allowed) throw new Error("Metal source permission evidence changed before persistence.");
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
        const { rows } = await upsertFinancialPrice(client, { ...price, assetId: assetIds.get(price.sourceAssetId), sourceId: input.sourceId, datasetId: input.datasetId });
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
