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

test("market fixtures are visibly marked as development mock data and kept apart from World Bank data", async () => {
  const [fixtures, preview, productionSnapshot] = await Promise.all([read("src/lib/data-platform/mock-stocks.ts"), read("src/app/(locale)/[locale]/stock-prototype.tsx"), read("src/data/world-bank.json")]);
  assert.match(fixtures, /Development-only fixtures/);
  assert.match(fixtures, /DEVELOPMENT MOCK/);
  assert.match(preview, /role="note"/);
  assert.doesNotMatch(productionSnapshot, /mock|DEVELOPMENT/i);
});
