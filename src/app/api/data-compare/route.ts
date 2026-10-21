import { indicators } from "@/lib/data-platform/registry";
import { countryByCode } from "@/lib/data-platform/countries";
import { observationsFor } from "@/lib/data-platform/snapshot";
import { compareWorldBankCountries, getReviewedWorldBankSourceInfo } from "@/lib/db/world-bank-repository";
import { resolveDatabaseTarget } from "../../../../scripts/db/connection-safety.mjs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const codes = [...new Set((url.searchParams.get("countries") ?? "").split(",").map((value) => value.toLowerCase()).filter(Boolean))];
  const indicator = indicators.find((item) => item.id === url.searchParams.get("indicator"));
  if (codes.length < 2 || codes.length > 5 || codes.some((code) => !countryByCode(code)) || !indicator) {
    return Response.json({ error: "Invalid comparison selection" }, { status: 400 });
  }

  const selectedSource = process.env.WORLD_BANK_DATA_SOURCE ?? "json";
  if (selectedSource !== "json" && selectedSource !== "db") {
    return Response.json({ error: "Invalid World Bank data source configuration" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (selectedSource === "db") {
    if (!["SL.UEM.TOTL.ZS", "EG.ELC.ACCS.ZS"].includes(indicator.code)) {
      return Response.json({ error: "This indicator is not approved for World Bank DB mode" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (process.env.DB_TARGET !== "development") {
      return Response.json({ error: "World Bank DB mode is available only for the local development database" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    try {
      resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DATABASE_URL });
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
  return Response.json({ indicator: indicator.id, series }, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
