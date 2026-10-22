import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateGoldConversion, calculateMarketChange, isValidMarketDate, validateMarketPriceRecord } from "../src/lib/data-platform/financial-market.mjs";
import { collectFinancialProviderSnapshot, FinancialProviderError } from "../src/lib/data-platform/financial-provider.mjs";
import { createUpbitKrwDailyProvider, upbitKrwAssets } from "../src/lib/data-platform/providers/upbit.mjs";
import { getFinancialProvider, listFinancialProviders } from "../src/lib/data-platform/providers/catalog.mjs";
import { FINANCIAL_API_CACHE_CONTROL, financialApiErrorResponse, financialApiResponse, parseFinancialCompanyFactsQuery, parseFinancialHeatmapQuery, parseFinancialHistoryQuery, parseFinancialListQuery } from "../src/lib/data-platform/financial-api.mjs";
import { allowFinancialRequest } from "../src/lib/data-platform/financial-rate-limit.mjs";
import { classifyFinancialDatabaseError } from "../src/lib/data-platform/financial-db-error.mjs";

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

test("Upbit adapter normalizes KRW daily candles without inventing market caps", async () => {
  const requested = [];
  const provider = createUpbitKrwDailyProvider({
    now: () => new Date("2026-10-22T01:00:00.000Z"),
    wait: async () => {},
    fetchImpl: async (url) => {
      requested.push(new URL(url));
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        async json() {
          const market = new URL(requested.at(-1)).searchParams.get("market");
          return [{
            market,
            candle_date_time_utc: "2026-10-21T00:00:00",
            candle_date_time_kst: "2026-10-21T09:00:00",
            opening_price: 90000000,
            high_price: 91000000,
            low_price: 89000000,
            trade_price: 90500000,
            candle_acc_trade_volume: 12.3456789,
          }];
        },
      };
    },
  });
  const result = await provider.fetchDailyPrices({ startDate: "2026-10-21", endDate: "2026-10-21", signal: new AbortController().signal });
  assert.equal(result.assets.length, 8);
  assert.equal(result.prices.length, 8);
  assert.equal(result.prices[0].referenceDate, "2026-10-21");
  assert.equal(result.prices[0].referenceTimezone, "Asia/Seoul");
  assert.equal(result.prices[0].close, "90500000");
  assert.equal(result.prices[0].marketCap, null);
  assert.equal(result.assets[0].currency, "KRW");
  assert.equal(result.assets[0].venue, "upbit-krw");
  assert.equal(requested.length, 8);
  assert.equal(requested[0].searchParams.get("market"), "KRW-BTC");
  assert.equal(upbitKrwAssets.length, 8);
});

test("provider catalog distinguishes free technical API access from public data rights", () => {
  const providers = listFinancialProviders();
  const upbit = providers.find((item) => item.id === "upbit-quotation");
  const sec = providers.find((item) => item.id === "sec-edgar-companyfacts");
  const dart = providers.find((item) => item.id === "opendart-company-financials");
  assert.equal(upbit.access, "free-public-api");
  assert.equal(upbit.rightsStatus, "pending");
  assert.equal(upbit.publicDisplay, "pending");
  assert.equal(upbit.databaseRetention, "pending");
  assert.equal(getFinancialProvider("upbit-quotation").licenseStatus, "unverified");
  assert.equal(typeof getFinancialProvider("sec-edgar-companyfacts").collect, "function");
  assert.equal(sec.rightsStatus, "verified-sec-edgar-public-filings");
  assert.equal(sec.publicDisplay, "permitted-for-sec-public-filing-content");
  assert.equal(dart.apiKeyRequired, true);
  assert.equal(dart.rightsStatus, "pending-display-and-retention-review");
  assert.equal(dart.configured, Boolean(process.env.OPENDART_API_KEY ?? process.env.DART_API_KEY));
});

test("financial API parsers bound pagination, validate filters, dates, and identifiers", async () => {
  assert.deepEqual(parseFinancialListQuery(new URLSearchParams("market=krw&page=2&pageSize=500&sort=marketCap&order=desc&q=BTC"), "crypto"), {
    ok: true, page: 2, pageSize: 100, offset: 100, sort: "marketCap", order: "desc", market: "krw", search: "BTC", referenceDate: null,
  });
  assert.equal(parseFinancialListQuery(new URLSearchParams("sort=close%20desc"), "stock").ok, false);
  assert.equal(parseFinancialListQuery(new URLSearchParams("market=usd"), "stock").ok, false);
  assert.equal(parseFinancialListQuery(new URLSearchParams("date=2026-02-30"), "crypto").ok, false);
  assert.deepEqual(parseFinancialHistoryQuery(new URLSearchParams("from=2026-01-01&to=2026-01-31&limit=5000"), "00000000-0000-4000-8000-000000000001"), {
    ok: true, limit: 1000, from: "2026-01-01", to: "2026-01-31",
  });
  assert.equal(parseFinancialHistoryQuery(new URLSearchParams(), "../../secrets").ok, false);
  assert.deepEqual(parseFinancialCompanyFactsQuery(new URLSearchParams("page=2&pageSize=50")), { ok: true, page: 2, pageSize: 50, offset: 50, period: null, ticker: null, latest: false });
  assert.deepEqual(parseFinancialCompanyFactsQuery(new URLSearchParams("period=annual&latest=true&pageSize=20")), { ok: true, page: 1, pageSize: 20, offset: 0, period: "annual", ticker: null, latest: true });
  assert.deepEqual(parseFinancialCompanyFactsQuery(new URLSearchParams("period=quarterly&ticker=nvda")), { ok: true, page: 1, pageSize: 100, offset: 0, period: "quarterly", ticker: "NVDA", latest: false });
  assert.equal(parseFinancialCompanyFactsQuery(new URLSearchParams("period=monthly")).error, "invalid_period");
  assert.equal(parseFinancialCompanyFactsQuery(new URLSearchParams("ticker=NVDA%3Bdrop%20table")).error, "invalid_ticker");
  assert.equal(parseFinancialCompanyFactsQuery(new URLSearchParams("latest=true")).error, "invalid_latest_query");
  assert.equal(parseFinancialCompanyFactsQuery(new URLSearchParams("page=0")).ok, false);
  assert.deepEqual(parseFinancialHeatmapQuery(new URLSearchParams("market=krw&date=2026-01-01"), "crypto"), { ok: true, market: "krw", referenceDate: "2026-01-01" });
  assert.equal(FINANCIAL_API_CACHE_CONTROL, "no-store");
  assert.equal(financialApiResponse({ ok: true }).headers.get("cache-control"), "no-store");
  const unavailable = financialApiErrorResponse("financial-db-select-denied");
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: "financial_data_unavailable", reason: "financial-db-select-denied", message: "Financial market data is temporarily unavailable." });
});

test("SEC comparison query selects one latest statement per company and excludes cumulative quarters", async () => {
  const querySource = await readFile(new URL("../src/lib/db/financial-queries.ts", import.meta.url), "utf8");
  assert.match(querySource, /form='10-K' and "fiscalPeriod"='FY' and "durationDays" between 300 and 400/);
  assert.match(querySource, /form='10-Q' and "fiscalPeriod" in \('Q1','Q2','Q3'\) and "durationDays" between 65 and 110/);
  assert.match(querySource, /balance\.concept='Assets'.*balance\.start_date is null/);
  assert.match(querySource, /balance\.concept='Liabilities'.*balance\.start_date is null/);
  assert.match(querySource, /partition by "companyId" order by "endDate" desc,"filedDate" desc/);
  assert.match(querySource, /where \(not \$3::boolean or latest_row=1\)/);
});

test("financial endpoints enforce a bounded per-client request window", () => {
  const client = `finance-rate-test-${Date.now()}`;
  const start = 1_800_000_000_000;
  for (let index = 0; index < 120; index += 1) assert.equal(allowFinancialRequest(client, start + index).allowed, true);
  const limited = allowFinancialRequest(client, start + 121);
  assert.equal(limited.allowed, false);
  assert.ok(limited.retryAfterSeconds > 0 && limited.retryAfterSeconds <= 60);
  assert.equal(allowFinancialRequest(client, start + 60_001).allowed, true);
});

test("financial DB failures distinguish configuration, connection, SELECT, schema and query errors", () => {
  assert.equal(classifyFinancialDatabaseError({ code: "financial-db-config-missing" }), "financial-db-config-missing");
  assert.equal(classifyFinancialDatabaseError({ code: "ECONNREFUSED" }), "financial-db-connection-failed");
  assert.equal(classifyFinancialDatabaseError({ code: "42501" }), "financial-db-select-denied");
  assert.equal(classifyFinancialDatabaseError({ code: "42P01" }), "financial-db-schema-error");
  assert.equal(classifyFinancialDatabaseError({ code: "42883" }), "financial-db-query-failed");
});
