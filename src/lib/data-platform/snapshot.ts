import snapshotData from "@/data/world-bank.json";
import type { DataObservation, DataSnapshot } from "./model";

const snapshot = snapshotData as DataSnapshot;
const observationsByIndicator = new Map<string, DataObservation[]>();
const observationsByIndicatorCountry = new Map<string, DataObservation[]>();

for (const item of snapshot.observations) {
  const allKey = item.indicator;
  const countryKey = `${item.indicator}:${item.country}`;
  const allRows = observationsByIndicator.get(allKey) ?? [];
  allRows.push(item);
  observationsByIndicator.set(allKey, allRows);
  const countryRows = observationsByIndicatorCountry.get(countryKey) ?? [];
  countryRows.push(item);
  observationsByIndicatorCountry.set(countryKey, countryRows);
}

for (const rows of observationsByIndicator.values()) rows.sort((a, b) => a.year - b.year || a.country.localeCompare(b.country));
for (const rows of observationsByIndicatorCountry.values()) rows.sort((a, b) => a.year - b.year);

export function observationsFor(indicator: string, country?: string) {
  if (country) return observationsByIndicatorCountry.get(`${indicator}:${country}`) ?? [];
  return observationsByIndicator.get(indicator) ?? [];
}

export function latestByCountry(indicator: string) {
  const rows = observationsFor(indicator);
  const latest = new Map<string, DataObservation>();
  for (const row of rows) latest.set(row.country, row);
  return [...latest.values()].sort((a, b) => b.value - a.value);
}

export function latestForCountry(indicator: string, country: string) {
  const rows = observationsFor(indicator, country);
  return rows.at(-1) ?? null;
}

export function getSnapshotMetadata() {
  return { generatedAt: snapshot.generatedAt, source: snapshot.source, observationCount: snapshot.observations.length };
}
