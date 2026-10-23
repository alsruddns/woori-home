import { isValidMarketDate } from "../financial-market.mjs";

const BASE_URL = "https://api.binance.com/api/v3";
const PAIRS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "SOLUSDT", "DOGEUSDT", "ADAUSDT", "TRXUSDT"];
function dec(value) {
  if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value.toFixed(10).replace(/\.?0+$/, "");
  return null;
}
const signedDec = (value) => typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value) ? value : null;
function apiError(response) { return Object.assign(new Error("Binance spot market request failed"), { status: response.status, retryAfterMs: Number(response.headers.get("retry-after")) * 1000 || undefined }); }

export function createBinanceSpotProvider({ fetchImpl = fetch, now = () => new Date(), wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  async function get(path, params = {}, signal) {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    const response = await fetchImpl(url, { headers: { accept: "application/json" }, signal });
    if (!response.ok) throw apiError(response);
    return response.json();
  }
  return {
    id: "binance-spot-market-data", datasetId: "binance-usdt-daily-candles", providerName: "Binance Spot Market Data",
    sourceUrl: "https://developers.binance.com/en/docs/products/spot/rest-api", attribution: "Source: Binance Spot USDT markets",
    assetType: "crypto", market: "usdt", marketTimezone: "UTC", licenseStatus: "unverified",
    async fetchMarkets({ signal } = {}) {
      const response = await get("/exchangeInfo", {}, signal);
      if (!Array.isArray(response.symbols)) throw new Error("Invalid Binance exchange info payload");
      return response.symbols.filter((item) => item.status === "TRADING" && item.quoteAsset === "USDT" && item.isSpotTradingAllowed)
        .map((item) => ({ market: item.symbol, symbol: item.baseAsset, name: item.baseAsset, quoteCurrency: "USDT", baseCurrency: item.baseAsset, venue: "binance-spot" }));
    },
    async fetchTickers(markets = PAIRS, { signal } = {}) {
      const allowed = [...new Set(markets)].filter((market) => /^[A-Z0-9]{3,20}USDT$/.test(market));
      const output = [];
      for (const market of allowed) {
        const row = await get("/ticker/24hr", { symbol: market }, signal);
        if (row.symbol !== market) throw new Error("Binance returned an unrequested symbol");
        output.push({ market, symbol: market.slice(0, -4), venue: "binance-spot", currency: "USDT", price: dec(row.lastPrice),
          change24hPercent: signedDec(row.priceChangePercent), volume24h: dec(row.volume), quoteVolume24h: dec(row.quoteVolume),
          asOf: Number.isFinite(row.closeTime) ? new Date(row.closeTime).toISOString() : null });
        await wait(80);
      }
      return output;
    },
    async fetchDailyPrices({ startDate, endDate, signal, limit = PAIRS.length }) {
      if (!isValidMarketDate(startDate) || !isValidMarketDate(endDate) || startDate > endDate) throw new Error("Invalid Binance date range");
      const assets = [], prices = [], fetchedAt = now().toISOString();
      const symbols = PAIRS.slice(0, Math.max(1, Math.min(PAIRS.length, Math.trunc(Number(limit) || PAIRS.length))));
      for (const symbol of symbols) {
        const pair = symbol.slice(0, -4);
        assets.push({ sourceAssetId: symbol, assetType: "crypto", symbol: pair, name: pair, venue: "binance-spot-usdt", countryCode: null, currency: "USDT", unit: "coin", timezone: "UTC", metadata: { market: symbol, quoteCurrency: "USDT" } });
        const startTime = Date.parse(`${startDate}T00:00:00.000Z`), endTime = Date.parse(`${endDate}T23:59:59.999Z`);
        let cursor = startTime;
        while (cursor <= endTime) {
          const rows = await get("/klines", { symbol, interval: "1d", startTime: cursor, endTime, limit: 1000 }, signal);
          if (!Array.isArray(rows)) throw new Error("Invalid Binance daily candle payload");
          if (rows.length === 0) break;
          for (const row of rows) {
            if (!Array.isArray(row) || row.length < 8 || !Number.isFinite(row[0])) throw new Error("Invalid Binance candle row");
            const referenceDate = new Date(row[0]).toISOString().slice(0, 10);
            const values = [row[1], row[2], row[3], row[4], row[5]].map(dec);
            if (values.some((value) => value === null)) throw new Error("Invalid Binance OHLCV values");
            prices.push({ sourceAssetId: symbol, referenceDate, referenceTimezone: "UTC", priceKind: "close", open: values[0], high: values[1], low: values[2], close: values[3], volume: values[4], marketCap: null, isAdjusted: false, fetchedAt, sourceUpdatedAt: Number.isFinite(row[6]) ? new Date(row[6]).toISOString() : null });
          }
          const lastOpenTime = rows.at(-1)?.[0];
          if (!Number.isFinite(lastOpenTime) || lastOpenTime < cursor) throw new Error("Binance candle pagination did not advance");
          cursor = lastOpenTime + 86_400_000;
          if (rows.length < 1000) break;
        }
        await wait(80);
      }
      return { assets, prices, snapshotVersion: fetchedAt };
    },
  };
}
