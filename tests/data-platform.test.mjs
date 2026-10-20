import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const snapshot = JSON.parse(await read("src/data/world-bank.json"));

test("World Bank snapshot contains validated observations and complete provenance", () => {
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.source, "World Bank");
  assert.ok(Date.parse(snapshot.generatedAt));
  assert.ok(snapshot.observations.length > 1000);
  for (const row of snapshot.observations) {
    assert.match(row.country, /^[A-Z]{3}$/);
    assert.match(row.indicator, /^[A-Z0-9.]+$/);
    assert.ok(Number.isInteger(row.year));
    assert.ok(Number.isFinite(row.value));
    assert.ok(row.unit);
    assert.equal(row.source, "World Bank");
    assert.match(row.sourceUrl, /^https:\/\/api\.worldbank\.org\/v2\//);
    assert.ok(row.license);
    assert.ok(row.lastCheckedAt);
    assert.ok(row.lastUpdatedAt);
  }
});

test("World Bank refresh is a batch adapter and retains the old snapshot on failure", async () => {
  const [adapter, updater] = await Promise.all([read("scripts/data/world-bank-adapter.mjs"), read("scripts/data/update-world-bank.mjs")]);
  assert.match(adapter, /api\.worldbank\.org\/v2/);
  assert.match(adapter, /Number\.isFinite\(row\.value\)/);
  assert.match(updater, /fallback/);
  assert.match(updater, /last checked-in snapshot was retained/);
  assert.doesNotMatch(updater, /NextRequest|request\.url/);
});

test("the data platform has translations for each supported locale", async () => {
  const copy = await read("src/lib/data-platform/locales.ts");
  for (const locale of ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi"]) {
    assert.match(copy, new RegExp(`(?:^|\\n)\\s*(?:"${locale}"|${locale}): \\{`));
  }
});

test("market fixtures are visibly marked as development sample data and kept apart from World Bank data", async () => {
  const [fixtures, preview, productionSnapshot] = await Promise.all([read("src/lib/data-platform/mock-stocks.ts"), read("src/app/(locale)/[locale]/stock-market-dashboard.tsx"), read("src/data/world-bank.json")]);
  assert.match(fixtures, /Development-only fixtures/);
  assert.match(fixtures, /DEVELOPMENT MOCK/);
  assert.match(preview, /role="note"/);
  assert.doesNotMatch(preview, /WOORI\.DATA|MARKET SNAPSHOT UI|Market breadth prototype|Snapshot schema preview|Market cap weighted layout|6 mock securities|debug/i);
  assert.doesNotMatch(productionSnapshot, /mock|DEVELOPMENT/i);
});

test("country route codes map one-to-one to all 15 countries present in the snapshot", async () => {
  const [registry, route] = await Promise.all([read("src/lib/data-platform/countries.ts"), read("src/app/(locale)/[locale]/(platform)/countries/[countryCode]/page.tsx")]);
  const codes = [...registry.matchAll(/\{ code: "([a-z]{2})", iso3: "([A-Z]{3})" \}/g)].map((match) => ({ alpha2: match[1], alpha3: match[2] }));
  const observed = new Set(snapshot.observations.filter((row) => row.country !== "WLD").map((row) => row.country));
  assert.equal(codes.length, 15);
  assert.equal(new Set(codes.map((item) => item.alpha3)).size, 15);
  assert.deepEqual(new Set(codes.map((item) => item.alpha3)), observed);
  assert.match(route, /dynamicParams = false/);
  assert.match(route, /generateStaticParams/);
  assert.match(route, /notFound\(\)/);
});

test("country comparison enforces 2–5 countries and reads the local snapshot only", async () => {
  const [client, api, copy] = await Promise.all([
    read("src/app/(locale)/[locale]/country-comparison.tsx"),
    read("src/app/api/data-compare/route.ts"),
    read("src/lib/data-platform/country-copy.ts"),
  ]);
  assert.match(client, /draftCountries\.length < 2/);
  assert.match(client, /draftCountries\.length > 5/);
  assert.match(client, /fetch\(`\/api\/data-compare\?/);
  assert.match(api, /observationsFor\(indicator\.code, country\.iso3\)/);
  assert.doesNotMatch(api, /fetch\(/);
  for (const locale of ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi"]) {
    assert.match(copy, new RegExp(`(?:^|\\n)\\s*(?:"${locale}"|${locale}): \\{`));
  }
});

test("country trend charts leave gaps disconnected and provide keyboard-accessible data points", async () => {
  const [chart, dashboard, sitemap] = await Promise.all([
    read("src/app/(locale)/[locale]/country-charts.tsx"),
    read("src/app/(locale)/[locale]/country-dashboard.tsx"),
    read("src/app/sitemap.ts"),
  ]);
  assert.match(chart, /observation\.year - segment\.at\(-1\)!\.year > 1/);
  assert.match(chart, /tabIndex=\{0\}/);
  assert.match(dashboard, /Dataset/);
  assert.match(dashboard, /SP\.POP\.TOTL/);
  assert.match(sitemap, /supportedCountries\.map/);
  assert.match(sitemap, /countries\/\$\{code\}/);
});
