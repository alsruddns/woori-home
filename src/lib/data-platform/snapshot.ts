import snapshotData from "@/data/world-bank.json";
import type { DataObservation, DataSnapshot } from "./model";

const snapshot = snapshotData as DataSnapshot;

export function observationsFor(indicator: string, country?: string) {
  return snapshot.observations.filter((item) => item.indicator === indicator && (!country || item.country === country));
}

export function latestByCountry(indicator: string) {
  const latest = new Map<string, DataObservation>();
  for (const row of observationsFor(indicator)) {
    const old = latest.get(row.country);
    if (!old || row.year > old.year) latest.set(row.country, row);
  }
  return [...latest.values()].sort((a, b) => b.value - a.value);
}

export function latestForCountry(indicator: string, country: string) {
  return observationsFor(indicator, country).sort((a, b) => b.year - a.year)[0] ?? null;
}

export function getSnapshotMetadata() {
  return { generatedAt: snapshot.generatedAt, source: snapshot.source, observationCount: snapshot.observations.length };
}
