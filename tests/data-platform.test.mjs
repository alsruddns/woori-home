import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const storedSnapshot = JSON.parse(await read("src/data/world-bank.json"));
const snapshot = { ...storedSnapshot, observations: storedSnapshot.observations.map((row) => ({ ...row, ...storedSnapshot.indicatorMetadata[row.indicator] })) };

test("World Bank snapshot contains validated observations and complete provenance", () => {
  assert.equal(snapshot.schemaVersion, 2);
  assert.equal(snapshot.source, "World Bank");
  assert.ok(Date.parse(snapshot.generatedAt));
  assert.ok(snapshot.observations.length > 1000);
  assert.equal(Object.keys(storedSnapshot.indicatorMetadata).length, 8);
  assert.equal(Object.keys(storedSnapshot.observations[0]).length, 5);
  for (const row of snapshot.observations) {
    assert.match(row.country, /^[A-Z]{3}$/);
    assert.match(row.indicator, /^[A-Z0-9.]+$/);
    assert.ok(Number.isInteger(row.year));
    assert.ok(Number.isFinite(row.value));
    assert.ok(row.unit);
    assert.equal(row.source, "World Bank");
    assert.ok(row.dataProvider);
    assert.match(row.sourceUrl, /^https:\/\/api\.worldbank\.org\/v2\//);
    assert.ok(row.license);
    assert.ok(row.lastCheckedAt);
    assert.ok(row.lastUpdatedAt);
  }
  const access = snapshot.observations.filter((row) => row.indicator === "EG.ELC.ACCS.ZS");
  assert.ok(access.length > 0);
  assert.ok(access.every((row) => row.unit === "percent of population" && /CC BY 4\.0/.test(row.license)));
  assert.equal(Math.max(...access.map((row) => row.year)), 2024);
});

test("only source-reviewed WDI additions are shipped and their upstream attribution is preserved", () => {
  const indicators = new Set(snapshot.observations.map((row) => row.indicator));
  assert.ok(indicators.has("SL.UEM.TOTL.ZS"));
  for (const deferred of ["NY.GDP.MKTP.KD.ZG", "FP.CPI.TOTL.ZG", "EG.FEC.RNEW.ZS", "EG.USE.PCAP.KG.OE", "EG.USE.ELEC.KH.PC"]) assert.ok(!indicators.has(deferred), `${deferred} rights remain unverified`);
  const laborSource = snapshot.observations.find((row) => row.indicator === "SL.UEM.TOTL.ZS");
  assert.match(laborSource.dataProvider, /International Labour Organization/);
  assert.match(laborSource.license, /ILOSTAT data CC BY 4\.0/);
});

test("NASA NeoWs snapshot is validated, date-scoped, and kept independent of visitor API calls", async () => {
  const data = JSON.parse(await read("src/data/nasa-neows.json"));
  const [adapter, workflow, category, page, explorer, audit] = await Promise.all([
    read("scripts/data/update-nasa-neows.mjs"), read(".github/workflows/update-nasa-neows.yml"),
    read("src/app/(locale)/[locale]/(platform)/[category]/page.tsx"), read("src/app/(locale)/[locale]/science-dashboard.tsx"),
    read("src/app/(locale)/[locale]/science-date-explorer.tsx"),
    read("docs/data-source-audit.md"),
  ]);
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.dates.length, 7);
  assert.ok(data.objects.length > 0);
  assert.ok(data.objects.every((item) => Number.isFinite(item.missDistanceKm) && Number.isFinite(item.relativeVelocityKmS) && Number.isFinite(item.estimatedDiameterMinM) && Number.isFinite(item.estimatedDiameterMaxM)));
  assert.match(adapter, /NASA_API_KEY \|\| "DEMO_KEY"/);
  assert.match(adapter, /previous checked-in snapshot was retained/);
  assert.match(adapter, /typeof asteroid\.is_potentially_hazardous_asteroid !== "boolean"/);
  assert.match(workflow, /ref: develop/);
  assert.match(workflow, /git push origin develop/);
  assert.match(category, /ScienceDashboard locale=\{locale\}/);
  assert.match(page, /ScienceDateExplorer locale=\{locale\} dates=\{snapshot\.dates\}/);
  assert.match(explorer, /objects\.filter\(\(object\) => object\.closeApproachDate === selected\)/);
  assert.match(explorer, /useTodayQueryDate/);
  assert.match(audit, /APOD image and video embedding remains deferred/);
});

test("energy and science data copy covers all 20 locales without an English-only fallback", async () => {
  const [energy, science, route, sitemap] = await Promise.all([
    read("src/lib/data-platform/energy-copy.ts"), read("src/lib/data-platform/science-copy.ts"),
    read("src/app/(locale)/[locale]/(platform)/[category]/page.tsx"), read("src/app/sitemap.ts"),
  ]);
  for (const locale of ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk"]) {
    assert.match(energy, new RegExp(`(?:^|\\n)\\s*"?${locale}"?: \\{`), `${locale}: missing energy content`);
    assert.match(science, new RegExp(`(?:^|\\n)\\s*"?${locale}"?: \\{`), `${locale}: missing science content`);
  }
  assert.match(energy, /distinct from electricity consumption/i);
  assert.match(route, /category === "energy" \|\| category === "science"/);
  assert.match(sitemap, /publicPortalPaths/);
  assert.doesNotMatch(sitemap, /energyDetails|publicDataPaths|localizedDataPaths/);
  assert.doesNotMatch(route, /indicator\.definition\[locale\] \?\? platformCopy\[locale\]\.sourceNote/);
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
  for (const locale of ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk"]) {
    assert.match(copy, new RegExp(`(?:^|\\n)\\s*(?:"${locale}"|${locale}): \\{`));
  }
});

test("development stock fixtures stay out of the public dashboard until licensed data exists", async () => {
  const [fixtures, preview, publicationAdapter, productionSnapshot] = await Promise.all([read("src/lib/data-platform/mock-stocks.ts"), read("src/app/(locale)/[locale]/stock-market-dashboard.tsx"), read("src/lib/data-platform/published-stocks.ts"), read("src/data/world-bank.json")]);
  assert.match(fixtures, /Development-only fixtures/);
  assert.match(fixtures, /DEVELOPMENT MOCK/);
  assert.doesNotMatch(preview, /mockDisclosure|mockLabel|mock-stocks/);
  assert.match(publicationAdapter, /return \[\]/);
  assert.match(publicationAdapter, /return undefined/);
  assert.doesNotMatch(preview, /WOORI\.DATA|MARKET SNAPSHOT UI|Market breadth prototype|Snapshot schema preview|Market cap weighted layout|6 mock securities|debug/i);
  assert.doesNotMatch(productionSnapshot, /DEVELOPMENT MOCK|schema preview|market breadth prototype/i);
});

test("country detail routes cover observed countries while comparisons support 20 valid countries", async () => {
  const [registry, route] = await Promise.all([read("src/lib/data-platform/countries.ts"), read("src/app/(locale)/[locale]/(platform)/countries/[countryCode]/page.tsx")]);
  const codes = [...registry.matchAll(/\{ code: "([a-z]{2})", iso3: "([A-Z]{3})" \}/g)].map((match) => ({ alpha2: match[1], alpha3: match[2] }));
  const observed = new Set(snapshot.observations.filter((row) => row.country !== "WLD").map((row) => row.country));
  assert.equal(codes.length, 20);
  assert.equal(new Set(codes.map((item) => item.alpha3)).size, 20);
  assert.ok([...observed].every((country) => codes.some((item) => item.alpha3 === country)));
  assert.match(registry, /export const dataCountries/);
  assert.match(route, /dataCountries\.map/);
  assert.match(route, /dynamicParams = false/);
  assert.match(route, /generateStaticParams/);
  assert.match(route, /notFound\(\)/);
});

test("country comparison defaults to ten countries, caps selections at twenty, and keeps source routing", async () => {
  const [client, api, route, copy] = await Promise.all([
    read("src/app/(locale)/[locale]/country-comparison.tsx"),
    read("src/lib/db/world-bank-comparison-handler.ts"),
    read("src/app/portal-api/world-bank/compare/route.ts"),
    read("src/lib/data-platform/country-copy.ts"),
  ]);
  assert.match(client, /draftCountries\.length < 2/);
  assert.match(client, /draftCountries\.length > 20/);
  assert.match(client, /current\.length < 20/);
  assert.match(client, /draftCountries\.length}\/20/);
  assert.match(api, /rawCodes\.length > 20/);
  const repository = await read("src/lib/db/world-bank-repository.ts");
  assert.match(repository, /countryIso3\.length > 20/);
  assert.match(client, /fetch\(`\/portal-api\/world-bank\/compare\?/);
  assert.match(route, /handleWorldBankComparison/);
  assert.match(api, /observationsFor\(indicator\.code, country\.iso3\)/);
  assert.doesNotMatch(api, /fetch\(/);
  const worldData = await read("src/app/(locale)/[locale]/world-data.tsx");
  assert.match(worldData, /\["kr", "us", "jp", "cn", "de", "gb", "fr", "in", "ca", "au"\]/);
  for (const locale of ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk"]) {
    assert.match(copy, new RegExp(`(?:^|\\n)\\s*(?:"${locale}"|${locale}): \\{`));
  }
});

test("mobile briefing overrides follow desktop component rules and keep metric cards readable", async () => {
  const css = await read("src/app/(locale)/[locale]/platform.css");
  const mobileRules = css.slice(css.lastIndexOf("/* Keep the responsive overrides after component rules"));
  assert.ok(mobileRules.length > 0);
  assert.match(mobileRules, /@media\(max-width:900px\)\{[\s\S]*?\.global-briefing-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(mobileRules, /@media\(max-width:600px\)\{[\s\S]*?\.global-briefing-metrics\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(mobileRules, /\.global-briefing-metrics strong\{[^}]*word-break:keep-all/);
  assert.match(mobileRules, /\.global-briefing-paper-list a\{[^}]*-webkit-line-clamp:3/);
  assert.match(mobileRules, /\.platform-controls\{display:flex;flex:1 1 100%/);
  assert.doesNotMatch(mobileRules, /overflow-x:hidden/);
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
  assert.match(sitemap, /publicPortalPaths/);
  assert.doesNotMatch(sitemap, /dataCountries|countries\/\$\{code\}/);
});
