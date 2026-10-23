import test from "node:test";
import assert from "node:assert/strict";
import { createBithumbKrwProvider } from "../src/lib/data-platform/providers/bithumb.mjs";
import { createBinanceSpotProvider } from "../src/lib/data-platform/providers/binance-spot.mjs";
import { createFscKrxStockProvider } from "../src/lib/data-platform/providers/fsc-krx-stocks.mjs";
import { createUpbitKrwDailyProvider } from "../src/lib/data-platform/providers/upbit.mjs";
import { canCollectFinancialPrices, canCreateFinancialVisualization, canPublishFinancialMarketData, financialRightsSummary } from "../src/lib/data-platform/financial-rights.mjs";
import { normalizeCurrentQuoteRows } from "../src/lib/data-platform/financial-quotes.mjs";
import { validateMarketPriceRecord } from "../src/lib/data-platform/financial-market.mjs";

const response = (body, status = 200) => ({ ok: status === 200, status, headers: { get: () => null }, async json() { return body; } });

test("Upbit reads exchange-local market catalog and preserves 24-hour quote currency and metrics", async () => {
  const provider = createUpbitKrwDailyProvider({ fetchImpl: async (url) => url.pathname.endsWith("/market/all")
    ? response([{ market: "KRW-BTC", korean_name: "비트코인", market_warning: "NONE" }])
    : response([{ market: "KRW-BTC", trade_price: 98000000, signed_change_rate: 0.025, acc_trade_volume_24h: 12, acc_trade_price_24h: 500000, timestamp: 1792728000000 }]) });
  const markets = await provider.fetchMarkets();
  const [quote] = await provider.fetchTickers([markets[0].market]);
  assert.equal(quote.market, "KRW-BTC");
  assert.equal(quote.currency, "KRW");
  assert.equal(quote.change24hPercent, "2.5");
  assert.equal(quote.volume24h, "12");
  assert.equal(quote.price, "98000000");
});

test("Bithumb OHLCV stays distinct from the ticker's 24-hour change and missing market cap", async () => {
  const provider = createBithumbKrwProvider({ wait: async () => {}, now: () => new Date("2026-10-23T00:00:00Z"), fetchImpl: async (url) => url.pathname.endsWith("/candles/days")
    ? response([{ market: "KRW-BTC", candle_date_time_kst: "2026-10-22T09:00:00", opening_price: 90000000, high_price: 91000000, low_price: 89000000, trade_price: 90500000, candle_acc_trade_volume: 10 }])
    : response([{ market: "KRW-BTC", trade_price: 90600000, signed_change_rate: -0.01, acc_trade_volume_24h: 11, timestamp: 1792728000000 }]) });
  const [quote] = await provider.fetchTickers(["KRW-BTC"]);
  const result = await provider.fetchDailyPrices({ startDate: "2026-10-22", endDate: "2026-10-22", limit: 1 });
  assert.equal(quote.change24hPercent, "-1");
  assert.equal(quote.currency, "KRW");
  assert.equal(result.prices[0].close, "90500000");
  assert.equal(result.prices[0].marketCap, null);
});

test("Binance USDT candles are never labelled USD", async () => {
  const provider = createBinanceSpotProvider({ wait: async () => {}, now: () => new Date("2026-10-23T12:00:00Z"), fetchImpl: async (url) => url.pathname.endsWith("/klines")
    ? response([[1792627200000, "100", "110", "90", "105", "12", 1792713599999, "1260"]])
    : response({ symbol: "BTCUSDT", lastPrice: "106", priceChangePercent: "-2.7", volume: "12", quoteVolume: "1200", closeTime: 1792728000000 }) });
  const [quote] = await provider.fetchTickers(["BTCUSDT"]);
  const result = await provider.fetchDailyPrices({ startDate: "2026-10-22", endDate: "2026-10-22", limit: 1 });
  assert.equal(quote.currency, "USDT");
  assert.equal(quote.change24hPercent, "-2.7");
  assert.equal(result.assets[0].currency, "USDT");
  assert.equal(result.prices[0].referenceTimezone, "UTC");
});

test("FSC/KRX official response fields preserve market, KRW, market cap and as-of date", async () => {
  const body = { response: { header: { resultCode: "00" }, body: { items: { item: [{ srtnCd: "005930", basDt: "20261022", mrktCtg: "KOSPI", clpr: "100000", vs: "500", fltRt: "0.5", mkp: "99500", hipr: "101000", lopr: "99000", trqu: "1000", mrktTotAmt: "600000000000" }] } } } };
  const provider = createFscKrxStockProvider({ serviceKey: "test", wait: async () => {}, now: () => new Date("2026-10-23T00:00:00Z"), fetchImpl: async () => response(body) });
  const result = await provider.fetchDailyPrices({ startDate: "2026-10-22", endDate: "2026-10-22", limit: 1 });
  assert.equal(result.assets[0].symbol, "005930");
  assert.equal(result.assets[0].currency, "KRW");
  assert.equal(result.assets[0].venue, "KOSPI");
  assert.equal(result.prices[0].close, "100000");
  assert.equal(result.prices[0].marketCap, "600000000000");
});

test("provider rights require separately confirmed scopes, a current review and explicit collection enablement", () => {
  const source = { financial_rights: { apiAccess: "confirmed", publicDisplay: "confirmed", dbStorage: "confirmed", longTermRetention: "confirmed", userApi: "confirmed", csvRedistribution: "pending", derivedVisualization: "pending" },
    terms_version: "terms-v3", reviewed_at: "2026-10-01T00:00:00Z", review_due_at: "2027-01-01T00:00:00Z", collection_enabled: true, attribution: "Source", source_url: "https://example.com" };
  const now = new Date("2026-10-23T00:00:00Z");
  assert.equal(canCollectFinancialPrices(source, now), true);
  assert.equal(canPublishFinancialMarketData(source, now), true);
  assert.equal(canCreateFinancialVisualization(source, now), false);
  assert.equal(canCollectFinancialPrices({ ...source, collection_enabled: false }, now), false);
  assert.equal(canCollectFinancialPrices({ ...source, review_due_at: "2026-10-22T00:00:00Z" }, now), false);
  assert.equal(canPublishFinancialMarketData({ ...source, financial_rights: { ...source.financial_rights, publicDisplay: "pending" } }, now), false);
  assert.equal(financialRightsSummary({ csvRedistribution: "denied" }).csvRedistribution, "denied");
});

test("current exchange quotes become separate 24-hour or session observations with matching currencies", () => {
  const assets = [{ sourceAssetId: "KRW-BTC", symbol: "BTC", currency: "KRW", timezone: "Asia/Seoul", metadata: { market: "KRW-BTC" } },
    { sourceAssetId: "BTCUSDT", symbol: "BTC", currency: "USDT", timezone: "UTC", metadata: { market: "BTCUSDT" } }];
  const rows = normalizeCurrentQuoteRows(assets, [
    { market: "KRW-BTC", currency: "KRW", price: "90000000", change24hPercent: "-1.2", volume24h: "3", asOf: "2026-10-22T15:00:00Z" },
    { market: "BTCUSDT", currency: "USDT", price: "65000", change24hPercent: "0.2", volume24h: "4", asOf: "2026-10-22T15:00:00Z" },
  ], { fetchedAt: "2026-10-22T15:00:00Z" });
  assert.equal(rows[0].priceKind, "quote-24h");
  assert.equal(rows[0].referenceDate, "2026-10-23");
  assert.equal(rows[1].referenceDate, "2026-10-22");
  assert.equal(rows[1].quoteWindow, "24h");
  assert.equal(validateMarketPriceRecord({ ...rows[0], assetId: "KRW-BTC", sourceId: "upbit", datasetId: "test" }).ok, true);
  assert.throws(() => normalizeCurrentQuoteRows(assets, [{ market: "KRW-BTC", currency: "USD", price: "90000000" }], { fetchedAt: "2026-10-22T15:00:00Z" }), /currency/);
  const session = normalizeCurrentQuoteRows([assets[0]], [{ market: "KRW-BTC", currency: "KRW", price: "90000000", changePercent: "-0.2", changeWindow: "session" }], { fetchedAt: "2026-10-22T15:00:00Z" });
  assert.equal(session[0].priceKind, "quote-session");
  assert.equal(session[0].quoteWindow, "session");
});
