import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWorldBankIndicator } from "./world-bank-adapter.mjs";
import { recordBatchStatus, writeJsonAtomically } from "./batch-status.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(root, "src/data/world-bank.json");
const countries = ["WLD", "USA", "CHN", "IND", "JPN", "KOR", "DEU", "GBR", "FRA", "BRA", "IDN", "MEX", "ZAF", "NGA", "AUS", "CAN"];
const indicators = [
  "SP.POP.TOTL", "NY.GDP.MKTP.CD", "NY.GDP.PCAP.CD", "SP.DYN.TFRT.IN", "SP.DYN.LE00.IN", "SP.POP.GROW",
  "SL.UEM.TOTL.ZS", "EG.ELC.ACCS.ZS",
];
const now = new Date().toISOString();
const fallback = await readFile(output, "utf8").catch(() => null);

try {
  const observations = [];
  for (const indicator of indicators) {
    const result = await fetchWorldBankIndicator({ indicator, countries, startYear: 1990, endYear: new Date().getUTCFullYear(), checkedAt: now });
    observations.push(...result.observations);
  }
  if (observations.length < countries.length * indicators.length) throw new Error("Snapshot validation failed: too few observations");
  observations.sort((a, b) => a.indicator.localeCompare(b.indicator) || a.country.localeCompare(b.country) || a.year - b.year);
  const previous = fallback ? JSON.parse(fallback) : null;
  const indicatorMetadata = {};
  const normalizedObservations = observations.map(({ country, countryName, indicator, year, value, ...metadata }) => {
    indicatorMetadata[indicator] ??= metadata;
    if (JSON.stringify(indicatorMetadata[indicator]) !== JSON.stringify(metadata)) throw new Error(`${indicator}: inconsistent indicator metadata in response`);
    return { country, countryName, indicator, year, value };
  });
  const comparable = (snapshot) => JSON.stringify({
    indicatorMetadata: Object.fromEntries(Object.entries(snapshot.indicatorMetadata).map(([code, metadata]) => [code, Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== "lastCheckedAt"))])),
    observations: snapshot.observations,
  });
  const snapshot = { schemaVersion: 2, source: "World Bank", generatedAt: now, indicatorMetadata, observations: normalizedObservations };
  if (previous?.schemaVersion === 2 && comparable(previous) === comparable(snapshot)) {
    console.log(`World Bank snapshot unchanged (${observations.length} observations); keeping the existing file.`);
    await recordBatchStatus({ snapshotPath: output, sourceId: "world-bank", datasetId: "world-development-indicators", status: "unchanged", referenceDate: String(Math.max(...observations.map((row) => row.year))), recordCount: observations.length, attemptedAt: now });
    process.exit(0);
  }
  await writeJsonAtomically(output, snapshot);
  await recordBatchStatus({ snapshotPath: output, sourceId: "world-bank", datasetId: "world-development-indicators", status: "success", referenceDate: String(Math.max(...observations.map((row) => row.year))), recordCount: observations.length, attemptedAt: now });
  console.log(`Wrote ${observations.length} validated observations from ${indicators.length} World Bank indicators.`);
} catch (error) {
  await recordBatchStatus({ snapshotPath: output, sourceId: "world-bank", datasetId: "world-development-indicators", status: "failed", error, attemptedAt: now });
  console.error("World Bank refresh failed; the last checked-in snapshot was retained.");
  throw error;
}
