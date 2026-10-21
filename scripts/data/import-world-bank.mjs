import "../db/load-env.mjs";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";
import { assertDatabaseRolesShareTarget, assertProductionOperation, requireDistinctDatabaseRoles } from "../db/production-operation.mjs";
import { IMPORTABLE_INDICATORS, LOCALES, localizedCountryNames, normalizeWorldBankSnapshot, parseImportArgs } from "./world-bank-import-core.mjs";

const { Pool } = pg;
const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadDataPlatformModule(relativePath) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loadedModule = { exports: {} };
  new Function("exports", "require", "module", output)(loadedModule.exports, require, loadedModule);
  return loadedModule.exports;
}

const { expandedIndicator } = loadDataPlatformModule("src/lib/data-platform/expanded-indicator-copy.ts");
const { energyAccessCopy } = loadDataPlatformModule("src/lib/data-platform/energy-copy.ts");
const unemploymentCopy = expandedIndicator("unemployment", "SL.UEM.TOTL.ZS", "economy");
const snapshotPath = resolve(root, "src/data/world-bank.json");
const snapshotBytes = await readFile(snapshotPath);
const snapshot = JSON.parse(snapshotBytes.toString("utf8"));
let options;
try {
  options = parseImportArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid import options.");
  process.exit(1);
}
let target;
try {
  if (process.env.WORLD_BANK_IMPORT_TARGET === "production") {
    const urls = [process.env.DATABASE_URL, process.env.DB_IMPORT_URL, process.env.DB_MIGRATION_URL];
    requireDistinctDatabaseRoles(urls);
    assertDatabaseRolesShareTarget(urls);
    target = assertProductionOperation({ databaseUrl: process.env.DB_IMPORT_URL, backupReference: process.env.PRODUCTION_BACKUP_REFERENCE, requireBackup: true });
  } else {
    target = resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DB_MIGRATION_URL ?? process.env.DATABASE_URL });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database configuration is invalid.");
  process.exit(1);
}

const normalized = normalizeWorldBankSnapshot(snapshot, options);
if (!normalized.observations.length) throw new Error("No approved observations matched the selected import scope.");
const checksum = createHash("sha256").update(snapshotBytes).digest("hex");
const version = snapshot.generatedAt ?? checksum.slice(0, 16);
const indicators = [...new Set(normalized.observations.map((row) => row.indicator))];
const countries = new Map(normalized.observations.map((row) => [row.country, row]));
const scope = {
  source: "src/data/world-bank.json",
  dataset: options.dataset,
  indicators,
  countries: [...countries.keys()].sort(),
  yearFrom: options.yearFrom ?? Math.min(...normalized.observations.map((row) => row.year)),
  yearTo: options.yearTo ?? Math.max(...normalized.observations.map((row) => row.year)),
  filters: { indicator: options.indicator ?? null, country: options.country ?? null },
};

if (options.dryRun) {
  console.log(`Dry run: ${normalized.observations.length} observations validated for ${indicators.length} approved indicators across ${countries.size} countries.`);
  console.log(`Skipped missing values: ${normalized.missing}; duplicate rows: ${normalized.duplicates}; snapshot SHA-256: ${checksum}`);
  process.exit(0);
}

const pool = new Pool({ connectionString: target.url, max: 2, connectionTimeoutMillis: 4000, idleTimeoutMillis: 10000, allowExitOnIdle: true });
const now = new Date();
const runId = randomUUID();
let insertedCount = 0;
let updatedCount = 0;
let skippedCount = normalized.missing + normalized.duplicates;
let stage = "catalog";
let lockClient;
try {
  lockClient = await pool.connect();
  await lockClient.query("select pg_advisory_lock(hashtext('woori-home:worldbank-import'))");
  await pool.query("select inserted_count, updated_count, skipped_count, scope from data_collection_runs limit 0");

  const catalog = await pool.connect();
  try {
    await catalog.query("begin");
    await catalog.query(`insert into data_sources (id, name, provider, source_url, license_status, license_name, license_url, attribution, rights_note, reviewed_at)
      values ('world-bank', 'World Bank', 'World Bank and reviewed third-party providers', 'https://data.worldbank.org/summary-terms-of-use', 'conditional', 'CC BY 4.0 default; indicator-specific terms apply', 'https://www.worldbank.org/ext/en/legal/terms-conditions/datasets', 'The World Bank: World Development Indicators; named source providers are credited per indicator.', 'Only individually reviewed CC BY 4.0 indicators are imported; other snapshot indicators remain excluded pending rights review.', $1)
      on conflict (id) do update set name=excluded.name, provider=excluded.provider, source_url=excluded.source_url, license_status=excluded.license_status, license_name=excluded.license_name, license_url=excluded.license_url, attribution=excluded.attribution, rights_note=excluded.rights_note, reviewed_at=excluded.reviewed_at, updated_at=now()`, [now]);
    await catalog.query(`insert into datasets (id, source_id, name, category, reference_period_kind, source_url)
      values ('world-development-indicators', 'world-bank', 'World Development Indicators', 'statistics', 'annual', 'https://data.worldbank.org/indicator')
      on conflict (id) do update set source_id=excluded.source_id, name=excluded.name, category=excluded.category, reference_period_kind=excluded.reference_period_kind, source_url=excluded.source_url, updated_at=now()`);

    for (const row of countries.values()) {
      const names = localizedCountryNames(row.iso2, row.countryName);
      await catalog.query(`insert into countries (iso3, iso2, world_bank_code, localized_names, is_aggregate)
        values ($1::char(3), $2::char(2), $1::varchar, $3::jsonb, $4)
        on conflict (iso3) do update set iso2=excluded.iso2, world_bank_code=excluded.world_bank_code, localized_names=excluded.localized_names, is_aggregate=excluded.is_aggregate, updated_at=now()`,
      [row.country, row.iso2, JSON.stringify(names), row.country === "WLD"]);
    }
    for (const code of indicators) {
      const license = IMPORTABLE_INDICATORS[code];
      const sample = normalized.observations.find((row) => row.indicator === code);
      const localizedNames = code === "SL.UEM.TOTL.ZS"
        ? unemploymentCopy.label
        : Object.fromEntries(Object.entries(energyAccessCopy).map(([locale, copy]) => [locale, copy.label]));
      const localizedDefinitions = code === "SL.UEM.TOTL.ZS"
        ? unemploymentCopy.definition
        : Object.fromEntries(Object.entries(energyAccessCopy).map(([locale, copy]) => [locale, copy.definition]));
      const definitions = {
        ...sample.metadata,
        source: "World Bank World Development Indicators",
        provider: license.provider,
        providerUrl: license.providerUrl,
        license: license.license,
        licenseUrl: license.licenseUrl,
        rightsNote: license.rightsNote,
        referencePeriod: "Annual observation year; latest year varies by country.",
        localizedDefinitions,
        locales: LOCALES,
      };
      await catalog.query(`insert into indicators (id, dataset_id, code, localized_names, definition, unit, frequency, is_modeled)
        values ($1, 'world-development-indicators', $1, $2::jsonb, $3::jsonb, $4, 'annual', $5)
        on conflict (id) do update set dataset_id=excluded.dataset_id, code=excluded.code, localized_names=excluded.localized_names, definition=excluded.definition, unit=excluded.unit, frequency=excluded.frequency, is_modeled=excluded.is_modeled, updated_at=now()`,
      [code, JSON.stringify(localizedNames), JSON.stringify(definitions), license.unit, code === "SL.UEM.TOTL.ZS"]);
    }
    await catalog.query("commit");
  } catch (error) {
    await catalog.query("rollback");
    throw error;
  } finally {
    catalog.release();
  }

  stage = "observations";
  for (let offset = 0; offset < normalized.observations.length; offset += 250) {
    const batch = normalized.observations.slice(offset, offset + 250);
    const client = await pool.connect();
    try {
      await client.query("begin");
      for (const row of batch) {
        const result = await client.query(`insert into indicator_observations (indicator_id, country_iso3, reference_year, value, published_at, last_checked_at, last_updated_at)
          values ($1, $2, $3, $4::numeric, $5, $6, $7)
          on conflict (indicator_id, country_iso3, reference_year) do update
            set value=excluded.value, published_at=excluded.published_at, last_checked_at=excluded.last_checked_at, last_updated_at=excluded.last_updated_at, updated_at=now()
            where indicator_observations.value is distinct from excluded.value or indicator_observations.last_updated_at is distinct from excluded.last_updated_at
          returning (xmax = 0) as inserted`,
        [row.indicator, row.country, row.year, row.value, row.metadata.publishedAt ?? null, row.metadata.lastCheckedAt ?? now, row.metadata.lastUpdatedAt ?? now]);
        if (result.rowCount === 0) skippedCount += 1;
        else if (result.rows[0].inserted) insertedCount += 1;
        else updatedCount += 1;
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  stage = "collection history";
  const latestYear = Math.max(...normalized.observations.map((row) => row.year));
  const writeRun = async (client) => client.query(`insert into data_collection_runs (id, dataset_id, started_at, finished_at, status, latest_reference_period, snapshot_version, checksum, record_count, scope, inserted_count, updated_count, skipped_count)
    values ($1, 'world-development-indicators', $2, now(), $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)`,
  [runId, now, insertedCount + updatedCount === 0 ? "unchanged" : "success", String(latestYear), String(version).slice(0, 80), checksum, normalized.observations.length, JSON.stringify(scope), insertedCount, updatedCount, skippedCount]);
  await writeRun(pool);
  console.log(`Import complete: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped; ${normalized.observations.length} observations validated.`);
  console.log(`Dataset: world-development-indicators; indicators: ${indicators.join(", ")}; countries/aggregates: ${countries.size}; latest reference year: ${latestYear}.`);
} catch (error) {
  try {
    await pool.query(`insert into data_collection_runs (id, dataset_id, started_at, finished_at, status, latest_reference_period, snapshot_version, checksum, record_count, scope, inserted_count, updated_count, skipped_count, error_category, error_message)
      values ($1, 'world-development-indicators', $2, now(), 'failed', null, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)`,
    [runId, now, String(version).slice(0, 80), checksum, normalized.observations.length, JSON.stringify(scope), insertedCount, updatedCount, skippedCount, stage, error instanceof Error ? error.message.slice(0, 2000) : "Unknown import error"]);
  } catch { /* Keep the original import failure. */ }
  console.error(`World Bank import failed during ${stage} for ${target.database}: ${error instanceof Error ? error.message : "Unknown import error."}`);
  process.exitCode = 1;
} finally {
  if (lockClient) {
    try { await lockClient.query("select pg_advisory_unlock(hashtext('woori-home:worldbank-import'))"); } catch { /* Closing the session releases the lock. */ }
    lockClient.release();
  }
  await pool.end();
}
