import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { adjacentCryptoDates, cryptoDates, cryptoHeatmapWeights, cryptoTreemapLayout, dailyCloseChange, deduplicateMarketIssues, isPublishableCryptoSnapshot, validUtcDate, validateCryptoSnapshot } from "../src/lib/data-platform/crypto-market.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const coin = (overrides = {}) => ({ id: "provider:bitcoin", symbol: "BTC", name: "Bitcoin", currency: "USD", close: 100, marketCap: 1000, volume: 100, ...overrides });
const fixture = { schemaVersion: 1, sourceId: "test-only", providerName: "Test fixture", licenseStatus: "approved", generatedAt: "2026-10-21T00:10:00Z", lastCheckedAt: "2026-10-21T00:10:00Z", snapshots: [
  { referenceDate: "2026-10-20", asOf: "2026-10-20T23:59:59Z", coins: [coin({ close: 100 })] },
  { referenceDate: "2026-10-21", asOf: "2026-10-21T23:59:59Z", coins: [coin({ close: 110, change24hPercent: -2 })] },
] };

test("crypto snapshots validate UTC dates, stable IDs, and unique asset/date rows", () => {
  assert.equal(validateCryptoSnapshot(fixture), true);
  assert.equal(validUtcDate("2026-10-21"), true);
  assert.equal(validUtcDate("2026-02-30"), false);
  assert.equal(validateCryptoSnapshot({ ...fixture, snapshots: [{ ...fixture.snapshots[0], coins: [coin(), coin()] }] }), false);
  assert.equal(validateCryptoSnapshot({ ...fixture, snapshots: [fixture.snapshots[0], fixture.snapshots[0]] }), false);
  assert.equal(validateCryptoSnapshot({ ...fixture, snapshots: [{ ...fixture.snapshots[0], referenceDate: "2026-02-30" }] }), false);
  assert.equal(validateCryptoSnapshot({ ...fixture, snapshots: [{ ...fixture.snapshots[0], coins: [coin({ close: 0 })] }] }), false);
});

test("date navigation uses only stored UTC calendar dates, including weekends", () => {
  const dates = cryptoDates(fixture);
  assert.deepEqual(dates, ["2026-10-20", "2026-10-21"]);
  assert.deepEqual(adjacentCryptoDates(dates, "2026-10-20"), { next: "2026-10-21", previous: undefined });
  assert.deepEqual(adjacentCryptoDates(dates, "2026-10-21"), { next: undefined, previous: "2026-10-20" });
});

test("daily close change is like-for-like and independent from rolling 24-hour change", () => {
  const move = dailyCloseChange(fixture.snapshots[1].coins[0], fixture.snapshots[0].coins[0]);
  assert.deepEqual(move, { amount: 10, percent: 10 });
  assert.equal(fixture.snapshots[1].coins[0].change24hPercent, -2);
  assert.deepEqual(dailyCloseChange(coin({ close: 110, previousUtcClose: 100 }), undefined), { amount: 10, percent: 10 });
  assert.equal(dailyCloseChange(coin({ currency: "KRW" }), coin()), null);
  assert.equal(dailyCloseChange(coin(), coin({ close: 0 })), null);
  assert.equal(dailyCloseChange(coin(), coin({ id: "provider:ether" })), null);
});

test("market-cap treemap weights require complete positive market-cap values", () => {
  const sample = [coin(), coin({ id: "provider:ether", marketCap: 3000 })];
  const weights = cryptoHeatmapWeights(sample);
  assert.equal(weights["provider:bitcoin"], 0.25);
  assert.equal(weights["provider:ether"], 0.75);
  const layout = cryptoTreemapLayout(sample);
  assert.ok(Math.abs(layout["provider:bitcoin"].width * layout["provider:bitcoin"].height / 10000 - weights["provider:bitcoin"]) < 1e-10);
  assert.ok(Math.abs(layout["provider:ether"].width * layout["provider:ether"].height / 10000 - weights["provider:ether"]) < 1e-10);
  assert.equal(cryptoHeatmapWeights([coin(), coin({ id: "provider:ether", marketCap: null })]), null);
  assert.equal(cryptoTreemapLayout([coin(), coin({ id: "provider:ether", marketCap: null })]), null);
});

test("issue deduplication preserves source identity and canonical issue order", () => {
  const issues = [
    { sourceId: "sec", externalId: "abc", url: "https://example.test/a", originalTitle:"One", publishedAt:"2026-10-21" },
    { sourceId: "sec", externalId: "abc", url: "https://example.test/duplicate", originalTitle:"Duplicate", publishedAt:"2026-10-21" },
    { sourceId: "fed", externalId: "abc", url: "https://example.test/b", originalTitle:"Two", publishedAt:"2026-10-21" },
    { sourceId: "sec", url: "https://example.test/c", originalTitle:"Three", publishedAt:"2026-10-21" },
  ];
  assert.deepEqual(deduplicateMarketIssues(issues), [issues[0], issues[2], issues[3]]);
});

test("production snapshots remain empty until a provider license is approved", async () => {
  const prices = JSON.parse(await read("src/data/crypto-prices.json"));
  const priceStatus = JSON.parse(await read("src/data/crypto-prices.status.json"));
  const cryptoIssues = JSON.parse(await read("src/data/crypto-issues.json"));
  const cryptoIssueStatus = JSON.parse(await read("src/data/crypto-issues.status.json"));
  const stockIssues = JSON.parse(await read("src/data/stock-issues.json"));
  const stockIssueStatus = JSON.parse(await read("src/data/stock-issues.status.json"));
  assert.equal(prices.licenseStatus, "unverified");
  assert.deepEqual(prices.snapshots, []);
  assert.equal(isPublishableCryptoSnapshot(prices), false);
  assert.deepEqual([priceStatus.status, cryptoIssueStatus.status, stockIssueStatus.status], ["disabled", "disabled", "disabled"]);
  assert.deepEqual([priceStatus.recordCount, cryptoIssueStatus.recordCount, stockIssueStatus.recordCount], [0, 0, 0]);
  assert.deepEqual(cryptoIssues.issues, []);
  assert.deepEqual(stockIssues.issues, []);
});

test("all twenty crypto UI locales are present and crypto routes stay out of the sitemap", async () => {
  const copy = await read("src/lib/data-platform/crypto-copy.ts");
  const stockCopy = await read("src/lib/data-platform/market-issue-copy.ts");
  for (const locale of ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"]) {
    assert.match(copy, new RegExp(`(?:^|\\n)\\s*(?:"${locale}"|${locale}): \\{`), `${locale} copy missing`);
    assert.match(stockCopy, new RegExp(`(?:^|\\n)\\s*(?:"${locale}"|${locale}):\\s*\\{`), `${locale} stock issue copy missing`);
  }
  const cryptoRoute = await read("src/app/(locale)/[locale]/(platform)/[category]/page.tsx");
  const cryptoIssuesRoute = await read("src/app/(locale)/[locale]/(platform)/crypto/issues/page.tsx");
  const stockIssuesRoute = await read("src/app/(locale)/[locale]/(platform)/stocks/issues/page.tsx");
  const sitemap = await read("src/app/sitemap.ts");
  assert.match(cryptoRoute, /category === "crypto"/);
  assert.match(cryptoIssuesRoute, /index: false/);
  assert.match(stockIssuesRoute, /index: false/);
  assert.doesNotMatch(sitemap, /crypto\/issues|\/crypto/);
});
