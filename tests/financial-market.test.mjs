import test from "node:test";
import assert from "node:assert/strict";
import { calculateGoldConversion, calculateMarketChange, isValidMarketDate, validateMarketPriceRecord } from "../src/lib/data-platform/financial-market.mjs";
import { collectFinancialProviderSnapshot, FinancialProviderError } from "../src/lib/data-platform/financial-provider.mjs";

const providerFixture = (overrides = {}) => ({
  id: "fixture-provider", datasetId: "fixture-daily-prices", licenseStatus: "verified",
  attribution: "Fixture attribution", sourceUrl: "https://example.invalid/source",
  async fetchDailyPrices() {
    return {
      snapshotVersion: "v1",
      assets: [{ sourceAssetId: "fixture:BTC-USD", assetType: "crypto", symbol: "BTC", name: "Bitcoin", currency: "USD", unit: "coin", timezone: "UTC" }],
      prices: [{ sourceAssetId: "fixture:BTC-USD", referenceDate: "2026-10-20", referenceTimezone: "UTC", priceKind: "close", close: "67234.1234567891", fetchedAt: "2026-10-21T10:00:00Z" }],
    };
  },
  ...overrides,
});
const providerRequest = { startDate: "2026-10-01", endDate: "2026-10-21", marketTimezone: "UTC" };
const providerNow = new Date("2026-10-21T12:00:00.000Z");

test("financial dates require a real calendar date and preserve UTC daily boundaries", () => {
  assert.equal(isValidMarketDate("2026-10-21"), true);
  assert.equal(isValidMarketDate("2026-02-30"), false);
  assert.equal(isValidMarketDate("2026-10-21T00:00:00Z"), false);
});

test("price validation preserves NUMERIC decimal strings and rejects invalid precision and nonfinite values", () => {
  const row = { assetId: "a", sourceId: "s", datasetId: "d", referenceDate: "2026-10-21", referenceTimezone: "UTC", priceKind: "close", close: "0.0000000001", fetchedAt: "2026-10-21T10:00:00Z" };
  assert.deepEqual(validateMarketPriceRecord(row), { ok: true, record: row });
  assert.equal(validateMarketPriceRecord({ ...row, close: "1.12345678901" }).reason, "precision-close");
  assert.equal(validateMarketPriceRecord({ ...row, close: "Infinity" }).reason, "invalid-close");
  assert.equal(validateMarketPriceRecord({ ...row, close: null }).reason, "missing-close");
  assert.equal(validateMarketPriceRecord({ ...row, volume: "-1" }).reason, "negative-volume");
});

test("daily changes use fixed-point arithmetic, and missing or zero previous closes are not calculated", () => {
  assert.deepEqual(calculateMarketChange("100.0000000001", "100"), { change: "0.0000000001", changePercent: "0.0000000001", direction: "up" });
  assert.deepEqual(calculateMarketChange("90", "100"), { change: "-10", changePercent: "-10", direction: "down" });
  assert.equal(calculateMarketChange("100", "0"), null);
  assert.equal(calculateMarketChange("100", null), null);
});

test("gold conversion requires same-currency source inputs and applies troy-ounce, gram and don units exactly", () => {
  assert.equal(calculateGoldConversion({ usdPerTroyOunce: "2000", usdPerKrw: "1300", observedDate: "2026-10-20", fxReferenceDate: "2026-10-20", targetUnit: "gram" }), "83591.9410784327");
  assert.equal(calculateGoldConversion({ usdPerTroyOunce: "2000", usdPerKrw: "1300", observedDate: "2026-10-20", fxReferenceDate: "2026-10-20", targetUnit: "don" }), "313469.7790441226");
  assert.equal(calculateGoldConversion({ usdPerTroyOunce: "2000", usdPerKrw: "1300", observedDate: "2026-10-20", fxReferenceDate: "2026-10-19", targetUnit: "gram" }), null);
  assert.equal(calculateGoldConversion({ usdPerTroyOunce: "0", usdPerKrw: "1300", observedDate: "2026-10-20", fxReferenceDate: "2026-10-20", targetUnit: "gram" }), null);
});

test("financial provider snapshots preserve decimal strings and normalize to the existing import contract", async () => {
  const result = await collectFinancialProviderSnapshot(providerFixture(), providerRequest, { now: providerNow });
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.sourceId, "fixture-provider");
  assert.equal(result.prices[0].close, "67234.1234567891");
});

test("financial provider collection remains disabled for unreviewed rights and refuses future dates", async () => {
  await assert.rejects(collectFinancialProviderSnapshot(providerFixture({ licenseStatus: "pending" }), providerRequest, { now: providerNow }), (error) => error instanceof FinancialProviderError && error.code === "provider-rights-unverified");
  await assert.rejects(collectFinancialProviderSnapshot(providerFixture(), { ...providerRequest, endDate: "2026-10-22" }, { now: providerNow }), (error) => error.code === "future-date");
});

test("financial provider collection bounds the date window and sanitizes invalid retry limits", async () => {
  await assert.rejects(collectFinancialProviderSnapshot(providerFixture(), { startDate: "2000-01-01", endDate: "2026-10-21", marketTimezone: "UTC" }, { now: providerNow }), (error) => error.code === "date-range-too-large");
  const result = await collectFinancialProviderSnapshot(providerFixture(), providerRequest, { now: providerNow, maxAttempts: Number.NaN });
  assert.equal(result.prices.length, 1);
});

test("financial provider retries rate limits with bounded backoff and does not leak provider errors", async () => {
  let calls = 0;
  const delays = [];
  const provider = providerFixture({ async fetchDailyPrices() {
    calls += 1;
    if (calls === 1) throw Object.assign(new Error("secret API key response body"), { status: 429, retryAfterMs: 8000 });
    return providerFixture().fetchDailyPrices();
  } });
  await collectFinancialProviderSnapshot(provider, providerRequest, { now: providerNow, maxAttempts: 2, maxDelayMs: 1000, sleep: async (delay) => delays.push(delay) });
  assert.equal(calls, 2);
  assert.deepEqual(delays, [1000]);
  const failing = providerFixture({ async fetchDailyPrices() { throw Object.assign(new Error("private token"), { status: 403 }); } });
  await assert.rejects(collectFinancialProviderSnapshot(failing, providerRequest, { now: providerNow }), (error) => error.code === "provider-request-failed" && !error.message.includes("private token"));
});

test("financial provider timeout aborts the request and returns a sanitized error", async () => {
  let receivedSignal;
  const provider = providerFixture({ fetchDailyPrices({ signal }) {
    receivedSignal = signal;
    return new Promise(() => {});
  } });
  await assert.rejects(collectFinancialProviderSnapshot(provider, providerRequest, { now: providerNow, timeoutMs: 100, maxAttempts: 1 }), (error) => error.code === "provider-timeout" && !error.message.includes("API key"));
  assert.equal(receivedSignal.aborted, true);
});

test("financial provider rejects duplicates, invalid units, and dates outside the requested range", async () => {
  const valid = await providerFixture().fetchDailyPrices();
  const duplicate = providerFixture({ async fetchDailyPrices() { return { ...valid, prices: [...valid.prices, ...valid.prices] }; } });
  const request = providerRequest;
  await assert.rejects(collectFinancialProviderSnapshot(duplicate, request), (error) => error.code === "duplicate-provider-price");
  const badTimezone = providerFixture({ async fetchDailyPrices() { return { ...valid, prices: [{ ...valid.prices[0], referenceTimezone: "Not/AZone" }] }; } });
  await assert.rejects(collectFinancialProviderSnapshot(badTimezone, request), (error) => error.code === "price-timezone-mismatch");
  const outside = providerFixture({ async fetchDailyPrices() { return { ...valid, prices: [{ ...valid.prices[0], referenceDate: "2026-09-30" }] }; } });
  await assert.rejects(collectFinancialProviderSnapshot(outside, request), (error) => error.code === "price-outside-requested-range");
});
