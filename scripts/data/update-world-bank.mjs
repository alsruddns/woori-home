import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWorldBankCountryCatalog, fetchWorldBankIndicator, WORLD_BANK_INDICATORS } from "./world-bank-adapter.mjs";
import { recordBatchStatus, writeJsonAtomically } from "./batch-status.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(root, "src/data/world-bank.json");
const indicators = WORLD_BANK_INDICATORS;
const now = new Date().toISOString();
const fallback = await readFile(output, "utf8").catch(() => null);

try {
  const observations = [];
  const countryMetadata = await fetchWorldBankCountryCatalog();
  for (const indicator of indicators) {
    const result = await fetchWorldBankIndicator({ indicator, countries: ["all"], startYear: 1960, endYear: new Date().getUTCFullYear(), checkedAt: now });
    observations.push(...result.observations);
  }
  if (countryMetadata.length < 190 || observations.length < countryMetadata.length * indicators.length) throw new Error("Snapshot validation failed: too few countries or observations");
  observations.sort((a, b) => a.indicator.localeCompare(b.indicator) || a.country.localeCompare(b.country) || a.year - b.year);
  const previous = fallback ? JSON.parse(fallback) : null;
  const indicatorMetadata = {};
  const normalizedObservations = observations.map(({ country, countryName, indicator, year, value, ...metadata }) => {
    indicatorMetadata[indicator] ??= metadata;
    if (JSON.stringify(indicatorMetadata[indicator]) !== JSON.stringify(metadata)) throw new Error(`${indicator}: inconsistent indicator metadata in response`);
    return { country, countryName, indicator, year, value };
  });
  const comparable = (snapshot) => JSON.stringify({
    countryMetadata: snapshot.countryMetadata,
    indicatorMetadata: Object.fromEntries(Object.entries(snapshot.indicatorMetadata).map(([code, metadata]) => [code, Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== "lastCheckedAt"))])),
    observations: snapshot.observations,
  });
  const allowedCountries = new Set(countryMetadata.map((country) => country.iso3));
  const countryObservations = normalizedObservations.filter((row) => allowedCountries.has(row.country));
  if (countryObservations.length < observations.length * 0.8) throw new Error("Snapshot validation failed: too many observations reference aggregate or unknown country codes");
  const snapshot = { schemaVersion: 2, source: "World Bank", generatedAt: now, countryMetadata, indicatorMetadata, observations: countryObservations };
  if (previous?.schemaVersion === 2 && comparable(previous) === comparable(snapshot)) {
    console.log(`World Bank snapshot unchanged (${observations.length} observations); keeping the existing file.`);
    await recordBatchStatus({ snapshotPath: output, sourceId: "world-bank", datasetId: "world-development-indicators", status: "unchanged", referenceDate: String(observations.reduce((latest, row) => Math.max(latest, row.year), 0)), recordCount: countryObservations.length, attemptedAt: now });
    process.exit(0);
  }
  await writeJsonAtomically(output, snapshot);
  await recordBatchStatus({ snapshotPath: output, sourceId: "world-bank", datasetId: "world-development-indicators", status: "success", referenceDate: String(observations.reduce((latest, row) => Math.max(latest, row.year), 0)), recordCount: countryObservations.length, attemptedAt: now });
  console.log(`Wrote ${countryObservations.length} validated observations from ${indicators.length} World Bank indicators across ${countryMetadata.filter((country) => !country.isAggregate).length} countries.`);
} catch (error) {
  await recordBatchStatus({ snapshotPath: output, sourceId: "world-bank", datasetId: "world-development-indicators", status: "failed", error, attemptedAt: now });
  console.error("World Bank refresh failed; the last checked-in snapshot was retained.");
  throw error;
}
