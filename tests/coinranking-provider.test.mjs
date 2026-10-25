import test from "node:test";
import assert from "node:assert/strict";
import { coinrankingAssetUuids, createCoinrankingProvider, getCoinrankingAssetAliases } from "../src/lib/data-platform/providers/coinranking.mjs";
import { getFinancialProvider, listFinancialProviders } from "../src/lib/data-platform/providers/catalog.mjs";
import { COINRANKING_MONTHLY_REQUEST_BUDGET, normalizeCoinrankingDailySnapshot, canReserveCoinrankingRequests } from "../src/lib/data-platform/coinranking-daily.mjs";

function response(data, status = 200, headers = {}) {
  return { ok: status >= 200 && status < 300, status, headers: { get: (key) => headers[key.toLowerCase()] ?? null }, async json() { return data; } };
}

test("Coinranking sends server-only token and exact UUIDs in one USD 24h quote request", async () => {
  let request;
  const provider = createCoinrankingProvider({ apiKey: "secret-test-token", now: () => new Date("2026-10-25T03:00:00.000Z"), fetchImpl: async (url, init) => {
    request = { url, init };
    return response({ status: "success", data: { coins: [
      { uuid: "Qwsogvtv82FCd", name: "Bitcoin", symbol: "BTC", price: "111234.56", change: "2.4", marketCap: "2200000000000", "24hVolume": "21000000000" },
      { uuid: "razxDUgYGNAdQ", name: "Ethereum", symbol: "ETH", price: "4000", change: "-1.2", marketCap: "400000000000", "24hVolume": "10000000000" },
      { uuid: "unrecognized-id", name: "Wrong asset", symbol: "BTC", price: "3", change: "99" },
    ] } });
  } });
  const result = await provider.fetchQuotes();
  assert.equal(request.url.origin, "https://api.coinranking.com");
  assert.equal(request.url.pathname, "/v2/coins");
  assert.deepEqual(request.url.searchParams.getAll("uuids[]"), coinrankingAssetUuids);
  assert.equal(request.url.searchParams.get("timePeriod"), "24h");
  assert.equal(request.init.headers["x-access-token"], "secret-test-token");
  assert.equal(request.init.cache, "no-store");
  assert.equal(result.currency, "USD");
  assert.equal(result.observedAt, "2026-10-25T03:00:00.000Z");
  assert.deepEqual(result.data.map(({ symbol }) => symbol), ["BTC", "ETH"]);
  assert.equal(result.data[0].change24hPercent, "2.4");
  assert.equal(result.data[1].change24hPercent, "-1.2");
  assert.equal(result.data[0].volume24h, "21000000000");
  assert.equal(result.data[0].currency, undefined);
});

test("Coinranking history accepts only mapped UUIDs and supported periods, returning timestamped prices", async () => {
  let requestedUrl;
  const provider = createCoinrankingProvider({ apiKey: "test", fetchImpl: async (url) => {
    requestedUrl = url;
    return response({ status: "success", data: { history: [{ price: "100", timestamp: 1792886400 }, { price: "invalid", timestamp: 1 }, { price: "-2", timestamp: 2 }] } });
  } });
  const history = await provider.fetchPriceHistory("Qwsogvtv82FCd", "30d");
  assert.equal(requestedUrl.pathname, "/v2/coin/Qwsogvtv82FCd/price-history");
  assert.equal(requestedUrl.searchParams.get("timePeriod"), "30d");
  assert.deepEqual(history, [{ timestamp: "2026-10-25T00:00:00.000Z", price: "100" }]);
  await assert.rejects(provider.fetchPriceHistory("BTC", "7d"), /Unknown Coinranking asset UUID/);
  await assert.rejects(provider.fetchPriceHistory("Qwsogvtv82FCd", "3y"), /Unsupported Coinranking history period/);
});

test("Coinranking provider stays rights-pending and collection-disabled in the registry", () => {
  const row = listFinancialProviders().find((provider) => provider.id === "coinranking-aggregate");
  assert.equal(row.rightsStatus, "pending-explicit-competition-and-public-display-review");
  assert.equal(row.collectionEnabled, false);
  assert.equal(row.rights.publicDisplay, "pending");
  assert.equal(row.rights.dbStorage, "pending");
  assert.equal(row.rights.rawRedistribution, "denied");
  assert.equal(typeof getFinancialProvider("coinranking-aggregate").fetchQuotes, "function");
});

test("Coinranking featured assets keep Korean and English search aliases", () => {
  assert.ok(getCoinrankingAssetAliases("Qwsogvtv82FCd").includes("비트코인"));
  assert.ok(getCoinrankingAssetAliases("razxDUgYGNAdQ").includes("이더리움"));
  assert.ok(getCoinrankingAssetAliases("-l8Mn2pVlRs-p").includes("리플"));
  assert.deepEqual(getCoinrankingAssetAliases("unmapped"), []);
});

test("Coinranking market collection paginates 300 UUIDs in bounded USD pages and respects the 5-per-second spacing", async () => {
  const calls = [];
  const waits = [];
  const data = Array.from({ length: 300 }, (_, index) => ({
    uuid: `coin-${index}`, name: `Coin ${index}`, symbol: `C${index}`, price: `${index + 1}.12345678901`,
    change: index % 2 ? "-1.25" : "2.5", marketCap: `${300 - index}000000`, "24hVolume": `${index}000`,
  }));
  const provider = createCoinrankingProvider({ apiKey: "do-not-print", now: () => new Date("2026-10-25T02:00:00Z"),
    fetchImpl: async (url) => {
      calls.push(url);
      const page = calls.length - 1;
      const start = page * 100;
      const nextCursor = page < 2 ? `cursor-${page + 1}` : undefined;
      return response({ status: "success", data: { coins: data.slice(start, start + 100), pagination: { hasNextPage: page < 2, nextCursor } } });
    } });
  const result = await provider.fetchTopMarketSnapshot({ wait: async (ms) => waits.push(ms) });
  assert.equal(result.data.length, 300);
  assert.equal(result.currency, "USD");
  assert.equal(result.observedAt, "2026-10-25T02:00:00.000Z");
  assert.equal(result.requestCount, 3);
  assert.deepEqual(waits, [250, 250]);
  assert.deepEqual(calls.map((url) => url.searchParams.get("limit")), ["100", "100", "100"]);
  assert.equal(calls[0].searchParams.get("referenceCurrencyUuid"), "yhjMzLPhuIDl");
  assert.equal(calls[1].searchParams.get("cursor"), "cursor-1");
  assert.equal(calls[2].searchParams.get("cursor"), "cursor-2");
  assert.equal(result.data[0].price, "1.123456789");
});

test("Coinranking pagination rejects duplicate UUIDs and malformed market fields", async () => {
  const page = Array.from({ length: 100 }, (_, index) => ({ uuid: `id-${index}`, name: `Coin ${index}`, symbol: `C${index}`, price: "1", change: "0", marketCap: "100", "24hVolume": "2" }));
  let calls = 0;
  const provider = createCoinrankingProvider({ apiKey: "test", fetchImpl: async () => {
    calls += 1;
    const coins = calls === 1 ? page : [{ ...page[0] }, ...page.slice(1)];
    return response({ status: "success", data: { coins, pagination: { hasNextPage: true, nextCursor: `c${calls}` } } });
  } });
  await assert.rejects(provider.fetchTopMarketSnapshot(), /duplicate or missing UUID/);
  const malformed = createCoinrankingProvider({ apiKey: "test", fetchImpl: async () => response({ status: "success", data: {
    coins: Array.from({ length: 100 }, (_, index) => ({ ...page[index], price: index === 4 ? "NaN" : "1" })),
    pagination: { hasNextPage: true, nextCursor: "next" },
  } }) });
  await assert.rejects(malformed.fetchTopMarketSnapshot(), /Invalid Coinranking market fields/);
});

test("daily normalization stores observed aggregate prices as quote-24h rows without fabricated OHLC", () => {
  const snapshot = {
    provider: "Coinranking", sourceUrl: "https://coinranking.com/", attribution: "Data provided by Coinranking",
    currency: "USD", quoteType: "daily-observed-aggregate-price", quoteWindow: "24h", observedAt: "2026-10-25T02:00:00.000Z", requestCount: 3,
    data: Array.from({ length: 300 }, (_, index) => ({ uuid: `uuid-${index}`, name: `Coin ${index}`, symbol: `C${index}`,
      price: "1.25", change24hPercent: "-2.5", marketCap: "1000000", volume24h: "500" })),
  };
  const normalized = normalizeCoinrankingDailySnapshot(snapshot);
  assert.equal(normalized.referenceDate, "2026-10-25");
  assert.equal(normalized.assets.length, 300);
  assert.equal(normalized.prices[0].priceKind, "quote-24h");
  assert.equal(normalized.prices[0].referenceTimezone, "UTC");
  assert.equal(normalized.prices[0].open, null);
  assert.equal(normalized.prices[0].close, "1.25");
  assert.equal(normalized.prices[0].quoteChangePercent, "-2.5");
  assert.equal(normalized.snapshotType, "daily-observed-aggregate-price");
  assert.throws(() => normalizeCoinrankingDailySnapshot({ ...snapshot, data: snapshot.data.slice(1) }), /daily collection contract/);
  assert.throws(() => normalizeCoinrankingDailySnapshot({ ...snapshot, data: snapshot.data.map((row, index) => index ? row : { ...row, uuid: "uuid-1" }) }), /malformed asset/);
});

test("Coinranking daily API budget hard-stops at 8,000 requests, below Free monthly 10,000", () => {
  assert.equal(COINRANKING_MONTHLY_REQUEST_BUDGET, 8000);
  assert.equal(canReserveCoinrankingRequests({ usedThisMonth: 7997, requested: 3 }), true);
  assert.equal(canReserveCoinrankingRequests({ usedThisMonth: 7998, requested: 3 }), false);
  assert.equal(canReserveCoinrankingRequests({ usedThisMonth: -1, requested: 3 }), false);
});
