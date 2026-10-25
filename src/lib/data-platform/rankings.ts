import type { DataObservation } from "./model";

export type RankedCountry = Pick<DataObservation, "country" | "countryName" | "year" | "value"> & { rank: number };

export function rankCountryObservations(
  rows: readonly Pick<DataObservation, "country" | "countryName" | "year" | "value">[],
  year: number,
  direction: "asc" | "desc" = "desc",
  aggregateCodes: ReadonlySet<string> = new Set(["WLD"]),
): RankedCountry[] {
  const selected = rows.filter((row) => !aggregateCodes.has(row.country) && row.year === year && Number.isFinite(row.value));
  const unique = new Map(selected.map((row) => [row.country, row]));
  const ordered = [...unique.values()].sort((a, b) => direction === "desc" ? b.value - a.value || a.country.localeCompare(b.country) : a.value - b.value || a.country.localeCompare(b.country));
  let previousValue: number | undefined;
  let rank = 0;
  return ordered.map((row, index) => {
    if (previousValue === undefined || row.value !== previousValue) rank = index + 1;
    previousValue = row.value;
    return { ...row, rank };
  });
}

export function periodChange(startValue: number | null | undefined, endValue: number | null | undefined) {
  if (startValue == null || endValue == null || !Number.isFinite(startValue) || !Number.isFinite(endValue)) return null;
  const absolute = endValue - startValue;
  return { absolute, percent: startValue === 0 ? null : absolute / Math.abs(startValue) * 100 };
}
