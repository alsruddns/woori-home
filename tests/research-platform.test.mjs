import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  module._compile(output, filename);
};
const { rankCountryObservations, periodChange } = require("../src/lib/data-platform/rankings.ts");
const { researchCopy, localizedNewCategories, researchFilterCopy } = require("../src/lib/data-platform/research-copy.ts");
const { homeBriefingCopy } = require("../src/lib/data-platform/home-briefing-copy.ts");
const { mineralCopy } = require("../src/lib/data-platform/mineral-copy.ts");
const { comparePeriodCopy, isRateIndicator } = require("../src/lib/data-platform/compare-period-copy.ts");

test("country rankings use exact-year country values, exclude aggregates, sort both ways, and share ties", () => {
  const rows = [
    { country: "AAA", countryName: "A", year: 2024, value: 8 },
    { country: "BBB", countryName: "B", year: 2024, value: 8 },
    { country: "CCC", countryName: "C", year: 2024, value: 2 },
    { country: "WLD", countryName: "World", year: 2024, value: 100 },
    { country: "AAA", countryName: "A", year: 2023, value: 99 },
  ];
  assert.deepEqual(rankCountryObservations(rows, 2024).map((row) => [row.country, row.rank]), [["AAA", 1], ["BBB", 1], ["CCC", 3]]);
  assert.deepEqual(rankCountryObservations(rows, 2024, "asc").map((row) => row.country), ["CCC", "AAA", "BBB"]);
  assert.deepEqual(rankCountryObservations(rows, 2022), []);
});

test("period change requires both observed endpoints and distinguishes absolute from relative change", () => {
  assert.deepEqual(periodChange(10, 12), { absolute: 2, percent: 20 });
  assert.deepEqual(periodChange(10, 8), { absolute: -2, percent: -20 });
  assert.equal(periodChange(0, 2)?.percent, null);
  assert.equal(periodChange(null, 2), null);
  assert.equal(periodChange(10, undefined), null);
  assert.equal(isRateIndicator("electricity-access"), true);
  assert.equal(isRateIndicator("population-growth"), true);
  assert.equal(isRateIndicator("population"), false);
});

test("research and commodity navigation copy is complete in every supported locale", () => {
  const locales = ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi"];
  for (const locale of locales) {
    const copy = researchCopy[locale];
    assert.ok(copy.papers && copy.papersDescription && copy.metadataNotice && copy.noSummary, `${locale}: papers copy`);
    assert.ok(copy.refreshNotice && copy.retractionNotice && copy.unknown, `${locale}: paper status copy`);
    assert.ok(researchFilterCopy[locale].keywords && researchFilterCopy[locale].fromDate && researchFilterCopy[locale].toDate, `${locale}: paper filters`);
    assert.ok(copy.commodities && copy.commoditiesDescription && copy.rightsPending && copy.unitNote, `${locale}: commodity copy`);
    assert.ok(!JSON.stringify(copy).includes("�"), `${locale}: malformed replacement character`);
    assert.doesNotMatch(JSON.stringify(copy), /[?]{2,}|[\uF900-\uFAFF]/, `${locale}: suspiciously corrupted translation`);
    assert.deepEqual(Object.keys(copy.topics).sort(), ["ai", "energy", "medicine", "physics"]);
    assert.ok(localizedNewCategories[locale].papers && localizedNewCategories[locale].commodities);
    assert.ok(comparePeriodCopy[locale].from && comparePeriodCopy[locale].to && comparePeriodCopy[locale].percentagePointUnit, `${locale}: comparison-period copy`);
  }
});

test("global home briefing and mineral source status are localized across all supported locales", async () => {
  const [briefing, mineralPage, mineralSource] = await Promise.all([
    read("src/app/(locale)/[locale]/global-data-briefing.tsx"),
    read("src/app/(locale)/[locale]/(platform)/commodities/page.tsx"),
    read("src/lib/data-platform/mineral-copy.ts"),
  ]);
  const locales = ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi"];
  for (const locale of locales) {
    const home = homeBriefingCopy[locale];
    assert.ok(home.briefing && home.population && home.gdp && home.electricityAccess && home.latestResearch && home.researchMetadataOnly, `${locale}: home briefing copy`);
    assert.ok(home.spaceData && home.closeApproaches && home.distance && home.diameter && home.mineralsPending, `${locale}: space/mineral copy`);
    assert.ok(mineralCopy[locale].description && mineralCopy[locale].scope && mineralCopy[locale].status && mineralCopy[locale].unitsNote, `${locale}: mineral source status`);
  }
  assert.match(briefing, /latestForCountry\("SP\.POP\.TOTL", "WLD"\)/);
  assert.match(briefing, /paperSnapshot\.records/);
  assert.match(briefing, /nearEarthSnapshot\.objects/);
  assert.match(mineralPage, /index: false/);
  assert.match(mineralPage, /P1WKQ63T/);
  assert.match(mineralSource, /90 nonfuel mineral commodities/);
});

test("country comparison uses exact observed endpoints and keeps percentage points separate from relative change", async () => {
  const page = await read("src/app/(locale)/[locale]/country-comparison.tsx");
  assert.match(page, /periodChange\(start\?\.value, end\?\.value\)/);
  assert.match(page, /periodCopy\.percentagePoints/);
  assert.match(page, /periodCopy\.percent/);
  assert.match(page, /availableYears/);
});

test("papers are daily Crossref metadata, article detail remains noindex, and commodity prices stay withheld", async () => {
  const [snapshotText, papersPage, paperDetail, commodityPage, workflow, publish, sitemap, appPages] = await Promise.all([
    read("src/data/research-papers.json"), read("src/app/(locale)/[locale]/(platform)/papers/page.tsx"),
    read("src/app/(locale)/[locale]/(platform)/papers/[paperId]/page.tsx"), read("src/app/(locale)/[locale]/(platform)/commodities/page.tsx"),
    read(".github/workflows/update-research-papers.yml"), read(".github/workflows/publish.yml"), read("src/app/sitemap.ts"),
    Promise.all(["src/app/(locale)/[locale]/page.tsx", "src/app/(locale)/[locale]/(platform)/world/page.tsx", "src/app/(locale)/[locale]/(platform)/countries/page.tsx", "src/app/(locale)/[locale]/(platform)/[category]/page.tsx", "src/app/(locale)/[locale]/(platform)/[category]/[slug]/page.tsx", "src/app/(locale)/[locale]/(platform)/world/[slug]/page.tsx"].map(read)),
  ]);
  const snapshot = JSON.parse(snapshotText);
  assert.equal(snapshot.source, "Crossref REST API");
  assert.ok(snapshot.records.length > 0);
  assert.ok(snapshot.records.every((record) => record.doi && record.title && record.publishedAt && !("abstract" in record)));
  assert.match(papersPage, /paperSnapshot.records/);
  assert.match(papersPage, /copy\.refreshNotice/);
  assert.match(paperDetail, /copy\.retractionNotice/);
  assert.match(papersPage, /is-referenced-by-count|citationCount/);
  assert.match(paperDetail, /index: false/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /ref: develop/);
  assert.match(workflow, /git push origin develop/);
  assert.match(publish, /branches: \[main\]/);
  assert.match(sitemap, /publicDataPaths/);
  assert.doesNotMatch(sitemap, /commodities/);
  assert.match(commodityPage, /index: false/);
  assert.match(commodityPage, /mineralCopy/);
  assert.match(commodityPage, /index: false/);
  assert.doesNotMatch(commodityPage, /records|priceSnapshot|commoditySnapshot|productionValues/i);
  assert.ok(appPages.every((page) => !page.includes(" | WOORI.TODAY")), "page titles have no site-name suffix");
});
