import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatMarketDate } from "../src/lib/data-platform/market-date-format.mjs";
import { calculateGoldConversion, calculateMarketChange, isValidMarketDate, validateMarketPriceRecord } from "../src/lib/data-platform/financial-market.mjs";
import { collectFinancialProviderSnapshot, FinancialProviderError } from "../src/lib/data-platform/financial-provider.mjs";
import { createUpbitKrwDailyProvider, upbitKrwAssets } from "../src/lib/data-platform/providers/upbit.mjs";
import { getFinancialProvider, listFinancialProviders } from "../src/lib/data-platform/providers/catalog.mjs";
import { FINANCIAL_API_CACHE_CONTROL, financialApiErrorResponse, financialApiResponse, parseFinancialCompanyFactsQuery, parseFinancialHeatmapQuery, parseFinancialHistoryQuery, parseFinancialListQuery } from "../src/lib/data-platform/financial-api.mjs";
import { allowFinancialRequest } from "../src/lib/data-platform/financial-rate-limit.mjs";
import { classifyFinancialDatabaseError } from "../src/lib/data-platform/financial-db-error.mjs";
import { companyFinancialMetrics, sicDivision, sicIndustryGroup } from "../src/lib/data-platform/company-financial-treemap.mjs";
import { createFinancialResponseCache, secFactsCacheVersion } from "../src/lib/data-platform/financial-response-cache.mjs";
import { fetchCompanyFacts } from "../src/lib/data-platform/company-facts-fetch.mjs";
import { adjacentCalendarDate, isDailySnapshotReady, previousDailyReferenceDate } from "../src/lib/data-platform/crypto-daily.mjs";
import { canCollectCryptoDailySnapshots, canCollectCoinrankingDailySnapshots, canPublishCryptoDailySnapshots } from "../src/lib/data-platform/financial-rights.mjs";

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

test("market snapshot date formatting accepts PostgreSQL Date values and ISO strings", () => {
  const options = { dateStyle: "medium", timeZone: "UTC" };
  const expected = new Intl.DateTimeFormat("en", options).format(new Date("2026-10-27T01:30:00.000Z"));
  assert.equal(formatMarketDate(new Date("2026-10-27T01:30:00.000Z"), "en", "No data"), expected);
  assert.equal(formatMarketDate("2026-10-27", "en", "No data"), expected);
  assert.equal(formatMarketDate(null, "en", "No data"), "No data");
  assert.equal(formatMarketDate("not-a-date", "en", "No data"), "No data");
});

test("crypto reference dates use the market calendar and wait for the finalized daily candle", () => {
  const beforeKstMidnight = new Date("2026-10-21T14:59:00.000Z");
  const afterKstMidnight = new Date("2026-10-21T15:01:00.000Z");
  assert.equal(previousDailyReferenceDate(beforeKstMidnight, "Asia/Seoul"), "2026-10-20");
  assert.equal(previousDailyReferenceDate(afterKstMidnight, "Asia/Seoul"), "2026-10-21");
  assert.equal(previousDailyReferenceDate(new Date("2026-10-22T00:01:00Z"), "UTC"), "2026-10-21");
  assert.equal(isDailySnapshotReady(new Date("2026-10-21T00:59:00Z"), "Asia/Seoul", 10), false);
  assert.equal(isDailySnapshotReady(new Date("2026-10-21T01:00:00Z"), "Asia/Seoul", 10), true);
  assert.equal(adjacentCalendarDate("2026-03-01"), "2026-02-28");
  assert.equal(adjacentCalendarDate("2026-02-30"), null);
});

test("crypto daily collection and publication require explicit daily and ad-supported rights", () => {
  const base = {
    collection_enabled: true, attribution: "Provider", source_url: "https://example.test/terms",
    financial_rights: { apiAccess: "confirmed", publicDisplay: "confirmed", dbStorage: "confirmed", longTermRetention: "confirmed", userApi: "confirmed", derivedVisualization: "confirmed", dailySnapshot: "confirmed", adSupportedDisplay: "confirmed" },
    terms_version: "daily-terms-v1", reviewed_at: "2026-10-20T00:00:00Z", review_due_at: "2027-10-20T00:00:00Z",
  };
  const now = new Date("2026-10-21T00:00:00Z");
  assert.equal(canCollectCryptoDailySnapshots(base, now), true);
  assert.equal(canPublishCryptoDailySnapshots(base, now), true);
  assert.equal(canCollectCryptoDailySnapshots({ ...base, financial_rights: { ...base.financial_rights, dailySnapshot: "pending" } }, now), false);
  assert.equal(canPublishCryptoDailySnapshots({ ...base, financial_rights: { ...base.financial_rights, adSupportedDisplay: "pending" } }, now), false);
  assert.equal(canPublishCryptoDailySnapshots({ ...base, review_due_at: "2026-10-20T00:00:00Z" }, now), false);
});

test("Coinranking storage and public publication require current verified competitor permission", () => {
  const now = new Date("2026-10-21T00:00:00Z");
  const pending = {
    id: "coinranking-aggregate", license_status: "unknown", collection_enabled: false,
    source_url: "https://coinranking.com/", attribution: "Data provided by Coinranking",
    financial_rights: { apiAccess: "pending", publicDisplay: "pending", userApi: "pending", dbStorage: "pending", longTermRetention: "pending",
      derivedVisualization: "pending", dailySnapshot: "pending", adSupportedDisplay: "pending", competitorPermission: "pending" },
    terms_version: null, reviewed_at: null, review_due_at: null,
  };
  assert.equal(canCollectCoinrankingDailySnapshots(pending, now), false);
  assert.equal(canPublishCryptoDailySnapshots({ ...pending, terms_version: "terms-v1", reviewed_at: "2026-10-20T00:00:00Z", review_due_at: "2027-10-20T00:00:00Z",
    license_status: "verified", collection_enabled: true, financial_rights: { ...Object.fromEntries(Object.keys(pending.financial_rights).map((right) => [right, "confirmed"])), competitorPermission: "pending" } }, now), false);
  const confirmed = { ...pending, license_status: "verified", collection_enabled: true, terms_version: "terms-v1", reviewed_at: "2026-10-20T00:00:00Z", review_due_at: "2027-10-20T00:00:00Z",
    financial_rights: Object.fromEntries(Object.keys(pending.financial_rights).map((right) => [right, "confirmed"])) };
  assert.equal(canCollectCoinrankingDailySnapshots(confirmed, now), true);
  assert.equal(canPublishCryptoDailySnapshots(confirmed, now), true);
  assert.equal(canCollectCoinrankingDailySnapshots({ ...confirmed, financial_rights: { ...confirmed.financial_rights, competitorPermission: "pending" } }, now), false);
});

test("price validation preserves NUMERIC decimal strings and rejects invalid precision and nonfinite values", () => {
  const row = { assetId: "a", sourceId: "s", datasetId: "d", referenceDate: "2026-10-21", referenceTimezone: "UTC", priceKind: "close", close: "0.0000000001", fetchedAt: "2026-10-21T10:00:00Z" };
  assert.deepEqual(validateMarketPriceRecord(row), { ok: true, record: row });
  assert.equal(validateMarketPriceRecord({ ...row, close: "1.12345678901" }).reason, "precision-close");
  assert.equal(validateMarketPriceRecord({ ...row, close: "Infinity" }).reason, "invalid-close");
  assert.equal(validateMarketPriceRecord({ ...row, close: null }).reason, "missing-close");
  assert.equal(validateMarketPriceRecord({ ...row, close: "0" }).reason, "nonpositive-close");
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
          const requestUrl = requested.at(-1);
          if (requestUrl.pathname.endsWith("/market/all")) return ["BTC", "ETH", "XRP", "SOL", "DOGE", "ADA", "BNB", "TRX", "DOT", "LINK", "LTC", "AVAX"].map((symbol) => ({ market: `KRW-${symbol}` }));
          const market = requestUrl.searchParams.get("market");
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
  assert.equal(result.assets.length, 12);
  assert.equal(result.prices.length, 12);
  assert.equal(result.prices[0].referenceDate, "2026-10-21");
  assert.equal(result.prices[0].referenceTimezone, "Asia/Seoul");
  assert.equal(result.prices[0].close, "90500000");
  assert.equal(result.prices[0].marketCap, null);
  assert.equal(result.assets[0].currency, "KRW");
  assert.equal(result.assets[0].venue, "upbit-krw");
  assert.equal(requested.length, 13);
  assert.equal(requested[0].pathname.endsWith("/market/all"), true);
  assert.equal(requested[1].searchParams.get("market"), "KRW-BTC");
  assert.equal(upbitKrwAssets.length, 12);
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
  assert.equal(upbit.rights.dailySnapshot, "pending");
  assert.equal(upbit.rights.adSupportedDisplay, "pending");
  assert.equal(getFinancialProvider("upbit-quotation").licenseStatus, "unverified");
  assert.equal(typeof getFinancialProvider("sec-edgar-companyfacts").collect, "function");
  assert.equal(sec.rightsStatus, "verified-sec-edgar-public-filings");
  assert.equal(sec.publicDisplay, "permitted-for-sec-public-filing-content");
  assert.equal(dart.apiKeyRequired, true);
  assert.equal(dart.rightsStatus, "pending-display-and-retention-review");
  assert.equal(dart.configured, Boolean(process.env.OPENDART_API_KEY ?? process.env.DART_API_KEY));
});

test("financial API parsers bound pagination, validate filters, dates, and identifiers", async () => {
  assert.equal(parseFinancialListQuery(new URLSearchParams("market=usdt"), "crypto").ok, true);
  assert.equal(parseFinancialListQuery(new URLSearchParams("sort=quoteChangePercent&order=asc"), "crypto").ok, true);
  assert.deepEqual(parseFinancialListQuery(new URLSearchParams("market=krw&page=2&pageSize=500&sort=marketCap&order=desc&q=BTC"), "crypto"), {
    ok: true, page: 2, pageSize: 100, offset: 100, sort: "marketCap", order: "desc", market: "krw", search: "BTC", referenceDate: null,
  });
  assert.equal(parseFinancialListQuery(new URLSearchParams("sort=close%20desc"), "stock").ok, false);
  assert.equal(parseFinancialListQuery(new URLSearchParams("market=usd"), "stock").ok, false);
  assert.equal(parseFinancialListQuery(new URLSearchParams("date=2026-02-30"), "crypto").ok, false);
  const { parseFinancialCryptoDailyQuery } = await import("../src/lib/data-platform/financial-api.mjs");
  assert.deepEqual(parseFinancialCryptoDailyQuery(new URLSearchParams()), { ok: true, market: "krw" });
  assert.deepEqual(parseFinancialCryptoDailyQuery(new URLSearchParams("market=usdt")), { ok: true, market: "usdt" });
  assert.equal(parseFinancialCryptoDailyQuery(new URLSearchParams("market=usd")).ok, false);
  assert.deepEqual(parseFinancialHistoryQuery(new URLSearchParams("from=2026-01-01&to=2026-01-31&limit=5000"), "00000000-0000-4000-8000-000000000001"), {
    ok: true, limit: 1000, from: "2026-01-01", to: "2026-01-31",
  });
  assert.equal(parseFinancialHistoryQuery(new URLSearchParams(), "../../secrets").ok, false);
  assert.deepEqual(parseFinancialCompanyFactsQuery(new URLSearchParams("page=2&pageSize=50")), { ok: true, page: 2, pageSize: 50, offset: 50, period: null, ticker: null, latest: false, fiscalYear: null });
  assert.deepEqual(parseFinancialCompanyFactsQuery(new URLSearchParams("period=annual&latest=true&pageSize=20")), { ok: true, page: 1, pageSize: 20, offset: 0, period: "annual", ticker: null, latest: true, fiscalYear: null });
  assert.deepEqual(parseFinancialCompanyFactsQuery(new URLSearchParams("period=quarterly&ticker=nvda")), { ok: true, page: 1, pageSize: 100, offset: 0, period: "quarterly", ticker: "NVDA", latest: false, fiscalYear: null });
  assert.deepEqual(parseFinancialCompanyFactsQuery(new URLSearchParams("period=annual&latest=true&fiscalYear=2025")).fiscalYear, 2025);
  assert.equal(parseFinancialCompanyFactsQuery(new URLSearchParams("period=annual&fiscalYear=20x5")).error, "invalid_fiscal_year");
  assert.equal(parseFinancialCompanyFactsQuery(new URLSearchParams("fiscalYear=2025")).error, "fiscal_year_requires_period");
  assert.equal(parseFinancialCompanyFactsQuery(new URLSearchParams("period=monthly")).error, "invalid_period");
  assert.equal(parseFinancialCompanyFactsQuery(new URLSearchParams("ticker=NVDA%3Bdrop%20table")).error, "invalid_ticker");
  assert.equal(parseFinancialCompanyFactsQuery(new URLSearchParams("latest=true")).error, "invalid_latest_query");
  assert.equal(parseFinancialCompanyFactsQuery(new URLSearchParams("page=0")).ok, false);
  assert.equal(sicDivision("2834").key, "manufacturing");
  assert.equal(sicDivision("6021").key, "finance-real-estate");
  assert.equal(sicDivision("0100").key, "agriculture");
  assert.equal(sicDivision("1000").key, "mining");
  assert.equal(sicDivision("5000").label, "Wholesale trade");
  assert.equal(sicDivision("5200").label, "Retail trade");
  assert.equal(sicDivision("9800").key, "unclassified");
  assert.equal(sicDivision(null).key, "unclassified");
  assert.deepEqual([
    sicIndustryGroup("7372"), sicIndustryGroup("3674"), sicIndustryGroup("2834"), sicIndustryGroup("6021"),
    sicIndustryGroup("1311"), sicIndustryGroup("5331"), sicIndustryGroup("4813"), sicIndustryGroup("3559"),
    sicIndustryGroup("7389"), sicIndustryGroup(null),
  ], ["technology", "semiconductors", "healthcare", "finance", "energy", "consumer", "telecom-media", "industrial", "other", "unclassified"]);
  assert.equal(sicIndustryGroup("5013"), "other", "wholesale trade must not be mislabeled as finance or retail");
  assert.equal(sicIndustryGroup("7990"), "other", "recreation services must not be mislabeled as telecom or media");
  assert.equal(sicIndustryGroup("2844"), "consumer", "soap and cosmetics manufacturers belong with consumer products");
  assert.equal(sicIndustryGroup("5171"), "energy", "petroleum bulk stations and terminals belong with energy");
  assert.equal(sicIndustryGroup("9800"), "unclassified");
  assert.equal(sicIndustryGroup("0000"), "unclassified");
  assert.deepEqual(companyFinancialMetrics({ revenue: "200", operatingIncome: "20", netIncome: "-5", assets: "300" }, { revenue: "100" }), {
    revenue: 200, operatingIncome: 20, netIncome: -5, assets: 300, revenueGrowth: 100, operatingMargin: 10, netMargin: -2.5,
  });
  assert.equal(companyFinancialMetrics({ revenue: "0", operatingIncome: "1", netIncome: null, assets: "-1" }, { revenue: "0" }).revenueGrowth, null);
  assert.deepEqual(parseFinancialHeatmapQuery(new URLSearchParams("market=krw&date=2026-01-01"), "crypto"), { ok: true, market: "krw", referenceDate: "2026-01-01" });
  assert.equal(FINANCIAL_API_CACHE_CONTROL, "no-store");
  assert.equal(financialApiResponse({ ok: true }).headers.get("cache-control"), "no-store");
  const cacheableResponse = financialApiResponse({ ok: true }, 200, { cacheControl: "public, max-age=30", headers: { "x-financial-cache": "HIT" } });
  assert.equal(cacheableResponse.headers.get("cache-control"), "public, max-age=30");
  assert.equal(cacheableResponse.headers.get("x-financial-cache"), "HIT");
  const limited = (await import("../src/lib/data-platform/financial-api.mjs")).financialRateLimitResponse(8);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "8");
  assert.equal(limited.headers.get("ratelimit-limit"), "120");
  assert.equal(limited.headers.get("ratelimit-remaining"), "0");
  const unavailable = financialApiErrorResponse("financial-db-select-denied");
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: "financial_data_unavailable", reason: "financial-db-select-denied", message: "Financial market data is temporarily unavailable." });
});

test("SEC response cache deduplicates work, expires by time and isolates collection versions", async () => {
  let now = 0;
  const cache = createFinancialResponseCache({ maxEntries: 2, maxBytes: 1024, ttlMs: 10, staleMs: 20, now: () => now });
  let loads = 0;
  const loader = async () => { loads += 1; await Promise.resolve(); return { value: loads }; };
  const [first, concurrent] = await Promise.all([cache.get("same", loader), cache.get("same", loader)]);
  assert.deepEqual(first, { value: { value: 1 }, state: "MISS" });
  assert.deepEqual(concurrent, { value: { value: 1 }, state: "MISS" });
  assert.equal((await cache.get("same", loader)).state, "HIT");
  now = 11;
  assert.deepEqual(await cache.get("same", async () => { throw new Error("temporary database failure"); }), { value: { value: 1 }, state: "STALE" });
  now = 32;
  await assert.rejects(cache.get("same", async () => { throw new Error("expired stale response"); }), /expired stale response/);
  assert.deepEqual(await cache.get("non-json", () => 1n), { value: 1n, state: "MISS" });
  assert.notEqual(secFactsCacheVersion({ lastRunStartedAt: new Date("2026-01-01T00:00:00Z") }), secFactsCacheVersion({ lastRunStartedAt: new Date("2026-01-02T00:00:00Z") }));
});

test("SEC facts 429 retry honors Retry-After once and does not retry other failures", async () => {
  const calls = [];
  const waits = [];
  const fetchImpl = async (_url, options) => {
    calls.push(options.cache);
    return calls.length === 1 ? new Response(null, { status: 429, headers: { "retry-after": "3" } }) : new Response("ok", { status: 200 });
  };
  const response = await fetchCompanyFacts("/portal-api/finance/companies?period=annual", { fetchImpl, wait: async (ms) => waits.push(ms) });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["default", "no-store"]);
  assert.deepEqual(waits, [3000]);
  let callsWithoutRetryAfter = 0;
  const failed = await fetchCompanyFacts("/facts", { fetchImpl: async () => { callsWithoutRetryAfter += 1; return new Response(null, { status: 429 }); } });
  assert.equal(failed.status, 429);
  assert.equal(callsWithoutRetryAfter, 1);
  const controller = new AbortController();
  controller.abort(new DOMException("test cancelled", "AbortError"));
  let callsAfterAbort = 0;
  await assert.rejects(fetchCompanyFacts("/facts", {
    signal: controller.signal,
    fetchImpl: async () => { callsAfterAbort += 1; return new Response(null, { status: 429, headers: { "retry-after": "1" } }); },
  }), /test cancelled/);
  assert.equal(callsAfterAbort, 1);
});

test("SEC facts session cache reuses fresh responses, expires them, and keeps URLs separate", async () => {
  const values = new Map();
  const storage = {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
  let now = 1_000;
  let calls = 0;
  const fetchImpl = async (url) => { calls += 1; return Response.json({ url, rows: [1, 2] }); };
  const url = "/portal-api/finance/companies?period=annual&pageSize=200";
  const first = await fetchCompanyFacts(url, { fetchImpl, storage, now: () => now });
  assert.deepEqual(await first.json(), { url, rows: [1, 2] });
  const second = await fetchCompanyFacts(url, { fetchImpl, storage, now: () => now });
  assert.deepEqual(await second.json(), { url, rows: [1, 2] });
  assert.equal(second.headers.get("x-financial-cache"), "SESSION");
  assert.equal(calls, 1);
  await fetchCompanyFacts(`${url}&fiscalYear=2025`, { fetchImpl, storage, now: () => now });
  assert.equal(calls, 2);
  now += 120_000;
  await fetchCompanyFacts(url, { fetchImpl, storage, now: () => now });
  assert.equal(calls, 3);
});

test("industry zoom labels cover all 26 Portal locales", async () => {
  const source = await readFile(new URL("../src/lib/data-platform/company-financial-industry-copy.ts", import.meta.url), "utf8");
  const keys = [...source.matchAll(/^\s*(?:"([^"]+)"|([a-z-]+)):\s*\{/gm)].map((match) => match[1] ?? match[2]);
  assert.deepEqual(keys, ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"]);
  const groups = await readFile(new URL("../src/lib/data-platform/company-financial-industry-groups.ts", import.meta.url), "utf8");
  const groupLocales = [...groups.matchAll(/^\s*(?:"([a-z-]+)"|([a-z-]+)): \{ technology:/gm)].map((match) => match[1] ?? match[2]);
  assert.deepEqual(groupLocales, keys);
  assert.equal((groups.match(/equalTiles: "/g) ?? []).length, keys.length);
  assert.equal((groups.match(/unscaled: "/g) ?? []).length, keys.length);
});

test("SEC industry cards keep natural height until needed and expose a keyboard-scrollable tile viewport", async () => {
  const component = await readFile(new URL("../src/app/(locale)/[locale]/company-financial-treemap.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/app/(locale)/[locale]/platform.css", import.meta.url), "utf8");
  const hints = await readFile(new URL("../src/lib/data-platform/company-financial-industry-scroll-hint.ts", import.meta.url), "utf8");

  assert.match(component, /viewport\.scrollHeight > viewport\.clientHeight \+ 1/);
  assert.match(component, /tabIndex=\{hasOverflow \? 0 : undefined\}/);
  assert.match(component, /role=\{hasOverflow \? "region" : undefined\}/);
  assert.match(component, /viewportNode\.current\.scrollTop = 0/);
  assert.match(component, /scrollResetKey = `\$\{areaMetric\}:\$\{colorMetric\}/);
  assert.match(component, /eligible\.map\(\(entry\)/, "all eligible companies remain in the rendered DOM");
  assert.match(component, /company-financial-industry-unscaled/);
  assert.match(styles, /\.company-financial-industry-scroll\{max-height:440px;overflow-x:clip;overflow-y:auto/);
  assert.match(styles, /@media\(max-width:1024px\)\{\.company-financial-industry-scroll\{max-height:380px\}\}/);
  assert.match(styles, /@media\(max-width:760px\)\{\.company-financial-industry-scroll\{max-height:320px\}/);
  assert.equal((hints.match(/^\s*(?:"[a-z-]+"|[a-z-]+): "/gm) ?? []).length, 26);
});

test("SEC comparison query selects one latest statement per company and excludes cumulative quarters", async () => {
  const querySource = await readFile(new URL("../src/lib/db/financial-queries.ts", import.meta.url), "utf8");
  assert.match(querySource, /form in \('10-K','10-K\/A'\) and "fiscalPeriod"='FY' and "durationDays" between 300 and 400/);
  assert.match(querySource, /form in \('10-Q','10-Q\/A'\) and "fiscalPeriod" in \('Q1','Q2','Q3'\) and "durationDays" between 65 and 110/);
  assert.match(querySource, /balance\.concept='Assets'.*balance\.start_date is null/);
  assert.match(querySource, /balance\.concept='Liabilities'.*balance\.start_date is null/);
  assert.match(querySource, /partition by "companyId" order by "endDate" desc,"filedDate" desc/);
  assert.match(querySource, /where \(not \$3::boolean or latest_row=1\)/);
  assert.match(querySource, /partition by "companyId","endDate","fiscalYear","fiscalPeriod" order by "filedDate" desc,case when form in \('10-K\/A','10-Q\/A'\) then 1 else 0 end desc/);
  assert.match(querySource, /c\.ticker=any\(\$4::text\[\]\)/);
  const countQuerySource = querySource.slice(querySource.indexOf("export async function countFinancialCompanyFacts"));
  assert.match(countQuerySource, /group by c\.id,f\.end_date,f\.fiscal_year,f\.fiscal_period/);
  assert.doesNotMatch(countQuerySource, /\$\{companyFactsRowsCte\} select count\(\*\)::int as total from ranked/);
  assert.match(countQuerySource, /count\(distinct c\.id\)::int as total/);
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
