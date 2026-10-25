import { indicators } from "@/lib/data-platform/registry";
import { countryByCode } from "@/lib/data-platform/countries";
import { observationsFor } from "@/lib/data-platform/snapshot";
import { compareWorldBankCountries, getReviewedWorldBankSourceInfo } from "@/lib/db/world-bank-repository";
import { resolveWorldBankDataSource, worldBankIndicatorSource } from "./world-bank-mode.mjs";

export async function handleWorldBankComparison(request: Request) {
  const url = new URL(request.url);
  const rawCodes = (url.searchParams.get("countries") ?? "").split(",").map((value) => value.toLowerCase()).filter(Boolean);
  const codes = [...new Set(rawCodes)];
  const indicator = indicators.find((item) => item.id === url.searchParams.get("indicator"));
  if (rawCodes.length > 5 || codes.length < 2 || codes.length > 5 || codes.some((code) => !countryByCode(code)) || !indicator) {
    return Response.json({ error: "Invalid comparison selection" }, { status: 400 });
  }

  let mode;
  try { mode = resolveWorldBankDataSource(); } catch {
    return Response.json({ error: "Invalid World Bank data source configuration" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const selectedSource = worldBankIndicatorSource(mode.source, indicator.code);
  if (selectedSource === "db") {
    try {
      const [seriesRows, sourceInfo] = await Promise.all([
        compareWorldBankCountries(indicator.code, codes.map((code) => countryByCode(code)!.iso3)),
        getReviewedWorldBankSourceInfo(indicator.code),
      ]);
      const series = codes.map((code) => {
        const country = countryByCode(code)!;
        return {
          code,
          iso3: country.iso3,
          observations: seriesRows.filter((row) => row.countryIso3 === country.iso3).map((row) => ({ year: row.year, value: Number(row.value), unit: row.unit })),
        };
      });
      return Response.json({ indicator: indicator.id, series, source: "db", sourceInfo }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return Response.json({ error: "World Bank database comparison is unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }

  const series = codes.map((code) => {
    const country = countryByCode(code)!;
    const observations = observationsFor(indicator.code, country.iso3);
    return {
      code,
      iso3: country.iso3,
      observations: observations.map(({ year, value, unit }) => ({ year, value, unit })),
    };
  });
  return Response.json({ indicator: indicator.id, series, source: "json" }, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
