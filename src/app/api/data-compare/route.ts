import { indicators } from "@/lib/data-platform/registry";
import { countryByCode } from "@/lib/data-platform/countries";
import { observationsFor } from "@/lib/data-platform/snapshot";

export function GET(request: Request) {
  const url = new URL(request.url);
  const codes = [...new Set((url.searchParams.get("countries") ?? "").split(",").map((value) => value.toLowerCase()).filter(Boolean))];
  const indicator = indicators.find((item) => item.id === url.searchParams.get("indicator"));
  if (codes.length < 2 || codes.length > 5 || codes.some((code) => !countryByCode(code)) || !indicator) {
    return Response.json({ error: "Invalid comparison selection" }, { status: 400 });
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
