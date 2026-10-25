import test from "node:test";
import assert from "node:assert/strict";
import { coinrankingAssetUuids, createCoinrankingProvider } from "../src/lib/data-platform/providers/coinranking.mjs";
import { getFinancialProvider, listFinancialProviders } from "../src/lib/data-platform/providers/catalog.mjs";

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
