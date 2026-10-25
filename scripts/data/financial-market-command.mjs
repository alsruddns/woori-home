import "../db/load-env.mjs";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";
import { collectFinancialProviderSnapshot } from "../../src/lib/data-platform/financial-provider.mjs";
import { getFinancialProvider, listFinancialProviders } from "../../src/lib/data-platform/providers/catalog.mjs";
import { canCollectCryptoDailySnapshots, canCollectFinancialPrices } from "../../src/lib/data-platform/financial-rights.mjs";
import { isDailySnapshotReady, previousDailyReferenceDate } from "../../src/lib/data-platform/crypto-daily.mjs";
import { normalizeCurrentQuoteRows } from "../../src/lib/data-platform/financial-quotes.mjs";

function parseOptions(args) {
  const options = {};
  for (const arg of args) {
    if (arg === "--dry-run" || arg === "--verbose") { options[arg.slice(2)] = true; continue; }
    const match = arg.match(/^--([a-z-]+)=(.+)$/);
    if (!match || Object.hasOwn(options, match[1])) throw new Error("Use --provider=ID --market=krw [--date=YYYY-MM-DD | --start-date=YYYY-MM-DD --end-date=YYYY-MM-DD] [--limit=1..8] [--dry-run] [--verbose].");
    options[match[1]] = match[2];
  }
  return options;
}

function dateInZone(date = new Date(), timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function writeProviderCatalog() {
  console.table(listFinancialProviders().map(({ id, name, markets, access, apiKeyRequired, rightsStatus, publicDisplay, databaseRetention }) => ({
    id, name, markets: markets.join(","), access, apiKeyRequired, rightsStatus, publicDisplay, databaseRetention,
  })));
}

async function runCollection(command, args) {
  const options = parseOptions(args);
  const providerId = options.provider;
  const provider = getFinancialProvider(providerId);
  const market = options.market ?? provider?.market ?? "krw";
  const maximumLimit = provider?.assetType === "crypto" ? 12 : 8;
  const limit = Math.max(1, Math.min(maximumLimit, Math.trunc(Number(options.limit ?? maximumLimit)) || maximumLimit));
  if (!provider || !provider.marketTimezone || !provider.datasetId) throw new Error("A supported provider with a configured daily-price adapter is required. Use `pnpm data:financial:providers` to view the catalog.");
  if (market !== provider.market) throw new Error(`This adapter only represents its own ${provider.market} market; quote currencies are never combined.`);
  if (options.date && (options["start-date"] || options["end-date"])) throw new Error("Use either --date or the --start-date/--end-date pair, not both.");
  if ((options["start-date"] && !options["end-date"]) || (!options["start-date"] && options["end-date"])) throw new Error("Both --start-date and --end-date are required together.");
  let startDate = options.date ?? options["start-date"] ?? dateInZone(new Date(Date.now() - 86_400_000), provider.marketTimezone);
  let endDate = options.date ?? options["end-date"] ?? startDate;
  if (provider.assetType === "crypto") {
    if (options["start-date"] || options["end-date"]) throw new Error("Crypto collection is daily-only; use one finalized prior-calendar-day snapshot.");
    if (!isDailySnapshotReady(new Date(), provider.marketTimezone, 10)) throw new Error("The prior daily candle is not considered final until 10:00 in the market timezone.");
    const expectedDate = previousDailyReferenceDate(new Date(), provider.marketTimezone);
    if (options.date && options.date !== expectedDate) throw new Error("Crypto daily collection is restricted to the prior finalized calendar day.");
    startDate = expectedDate;
    endDate = expectedDate;
  }
  const dryRun = command === "dry-run" || options["dry-run"] === true;

  const target = resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DATABASE_URL });
  const pool = new pg.Pool({ connectionString: target.url, max: 1, connectionTimeoutMillis: 4000, idleTimeoutMillis: 10000, allowExitOnIdle: true });
  let runId;
  try {
  const { rows: [source] } = await pool.query(`select s.id,s.attribution,s.source_url,s.financial_rights,s.terms_version,s.reviewed_at,s.review_due_at,s.collection_enabled,d.id as dataset_id
      from data_sources s join datasets d on d.source_id=s.id where s.id=$1 and d.id=$2`, [provider.id, provider.datasetId]);
    if (!source) throw new Error("Collection is disabled: the provider and dataset must be reviewed and registered in the local development DB first.");
    if (provider.assetType === "crypto" ? !canCollectCryptoDailySnapshots(source) : !canCollectFinancialPrices(source)) {
      throw new Error("Collection is disabled: activate this provider only after API access, database storage, long-term retention, attribution, terms version, and a current rights review are recorded.");
    }
    provider.licenseStatus = "verified";
    provider.attribution = source.attribution;
    provider.sourceUrl = source.source_url;

    const { rows: [run] } = await pool.query(`insert into data_collection_runs
      (dataset_id,started_at,status,scope) values ($1,now(),'partial',$2) returning id`, [provider.datasetId, JSON.stringify({ kind: "financial-collection", provider: provider.id, market, startDate, endDate, limit, dryRun })]);
    runId = run.id;
    const snapshot = await collectFinancialProviderSnapshot(provider, { startDate, endDate, marketTimezone: provider.marketTimezone, limit }, { maxAttempts: 3, timeoutMs: 15_000, maxRecords: 2_000 });
    if (provider.assetType !== "crypto" && typeof provider.fetchTickers === "function") {
      const markets = snapshot.assets.map((asset) => asset.metadata?.market ?? asset.sourceAssetId);
      const quotes = await provider.fetchTickers(markets, { signal: AbortSignal.timeout(30_000) });
      snapshot.prices.push(...normalizeCurrentQuoteRows(snapshot.assets, quotes, { fetchedAt: new Date().toISOString() }));
    }
    if (provider.assetType === "crypto" && snapshot.prices.some((price) => price.referenceDate !== startDate || price.referenceTimezone !== provider.marketTimezone)) {
      throw new Error("Crypto snapshot did not match the finalized prior-day boundary.");
    }
    if (options.verbose) {
      console.log(`Normalized ${snapshot.assets.length} assets and ${snapshot.prices.length} daily candles from ${provider.id}; live crypto ticker calls are disabled.`);
      if (snapshot.failures.length) console.log(`Unavailable crypto markets: ${snapshot.failures.map(({ symbol, reason }) => `${symbol}:${reason}`).join(", ")}`);
    }

    if (!dryRun) {
      const directory = await mkdtemp(path.join(os.tmpdir(), "woori-financial-"));
      const file = path.join(directory, "snapshot.json");
      try {
        await writeFile(file, JSON.stringify(snapshot), { encoding: "utf8", flag: "wx", mode: 0o600 });
        const result = spawnSync(process.execPath, ["scripts/data/import-financial-market.mjs", `--file=${file}`], { stdio: "inherit", env: process.env, windowsHide: true });
        if (result.error || result.status !== 0) throw new Error("Financial import failed after provider collection.");
      } finally { await rm(directory, { recursive: true, force: true }); }
    }

    await pool.query(`update data_collection_runs set finished_at=now(),status=$2,record_count=$3,latest_reference_period=$4,
      inserted_count=0,updated_count=0,skipped_count=$3 where id=$1`, [runId, dryRun ? "unchanged" : "success", snapshot.prices.length, snapshot.prices.map((row) => row.referenceDate).sort().at(-1)]);
    console.log(`${dryRun ? "Dry run complete" : "Collection complete"}: ${snapshot.assets.length} assets, ${snapshot.prices.length} price rows; rights verified for ${provider.id}.`);
  } catch (error) {
    if (runId) await pool.query(`update data_collection_runs set finished_at=now(),status='failed',error_category=$2,error_message=$3 where id=$1`, [runId, error?.code ?? "collection-failed", error instanceof Error ? error.message.slice(0, 1500) : "Financial collection failed."]).catch(() => {});
    throw error;
  } finally { await pool.end(); }
}

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "providers") writeProviderCatalog();
  else if (command === "collect" || command === "dry-run") await runCollection(command, args);
  else throw new Error("Usage: node scripts/data/financial-market-command.mjs <providers|collect|dry-run> [options]");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Financial collection failed.");
  process.exitCode = 1;
}
