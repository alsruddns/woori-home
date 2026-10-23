import { isValidMarketDate } from "../financial-market.mjs";

const BASE_URL = "https://api.bithumb.com/v1";
const SYMBOLS = ["BTC", "ETH", "XRP", "SOL", "BNB", "DOGE", "ADA", "TRX"];
const dec = (value) => {
  if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value.toFixed(10).replace(/\.?0+$/, "");
  return null;
};
const retryError = (response) => Object.assign(new Error("Bithumb quotation request failed"), { status: response.status, retryAfterMs: Number(response.headers.get("retry-after")) * 1000 || undefined });

export function createBithumbKrwProvider({ fetchImpl = fetch, now = () => new Date(), wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  async function get(path, params = {}, signal) {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    const response = await fetchImpl(url, { headers: { accept: "application/json" }, signal });
    if (!response.ok) throw retryError(response);
    return response.json();
  }
  return {
    id: "bithumb-public",
    datasetId: "bithumb-krw-daily-candles",
    providerName: "Bithumb Public API",
    sourceUrl: "https://apidocs.bithumb.com/",
    attribution: "Source: Bithumb KRW market quotation data",
    assetType: "crypto", market: "krw", marketTimezone: "Asia/Seoul", licenseStatus: "unverified",
    async fetchMarkets({ signal } = {}) {
      const rows = await get("/market/all", {}, signal);
      if (!Array.isArray(rows)) throw new Error("Invalid Bithumb market payload");
      return rows.filter((row) => typeof row.market === "string" && row.market.startsWith("KRW-"))
        .map((row) => ({ market: row.market, symbol: row.market.slice(4), name: row.korean_name ?? row.english_name ?? row.market.slice(4), quoteCurrency: "KRW", baseCurrency: row.market.slice(4), venue: "bithumb" }));
    },
    async fetchTickers(markets = SYMBOLS.map((symbol) => `KRW-${symbol}`), { signal } = {}) {
      const unique = [...new Set(markets)].filter((market) => /^KRW-[A-Z0-9]+$/.test(market));
      const output = [];
      for (let i = 0; i < unique.length; i += 100) {
        const batch = unique.slice(i, i + 100);
        const rows = await get("/ticker", { markets: batch.join(",") }, signal);
        if (!Array.isArray(rows)) throw new Error("Invalid Bithumb ticker payload");
        for (const row of rows) {
          if (!batch.includes(row.market)) throw new Error("Bithumb returned an unrequested market");
          const percent = Number(row.signed_change_rate) * 100;
          output.push({ market: row.market, symbol: row.market.slice(4), venue: "bithumb", currency: "KRW", price: dec(row.trade_price),
            change24hPercent: Number.isFinite(percent) ? String(percent) : null, volume24h: dec(row.acc_trade_volume_24h),
            quoteVolume24h: dec(row.acc_trade_price_24h), asOf: Number.isFinite(row.timestamp) ? new Date(row.timestamp).toISOString() : null });
        }
      }
      return output;
    },
    async fetchDailyPrices({ startDate, endDate, signal, limit = SYMBOLS.length }) {
      if (!isValidMarketDate(startDate) || !isValidMarketDate(endDate) || startDate > endDate) throw new Error("Invalid Bithumb date range");
      const assets = [], prices = [], fetchedAt = now().toISOString();
      for (const symbol of SYMBOLS.slice(0, Math.max(1, Math.min(SYMBOLS.length, Math.trunc(Number(limit) || SYMBOLS.length))))) {
        const market = `KRW-${symbol}`;
        assets.push({ sourceAssetId: market, assetType: "crypto", symbol, name: symbol, venue: "bithumb-krw", countryCode: "KR", currency: "KRW", unit: "coin", timezone: "Asia/Seoul", metadata: { market } });
        let cursor = endDate;
        let pages = 0;
        while (cursor >= startDate && pages++ < 20) {
          await wait(120);
          const rows = await get("/candles/days", { market, to: `${cursor}T23:59:59`, count: 200 }, signal);
          if (!Array.isArray(rows)) throw new Error("Invalid Bithumb candle payload");
          if (rows.length === 0) break;
          for (const row of rows) {
            if (row.market !== market) throw new Error("Bithumb returned a candle for another market");
            const referenceDate = row.candle_date_time_kst?.slice(0, 10);
            if (!isValidMarketDate(referenceDate)) throw new Error("Invalid Bithumb candle date");
            if (referenceDate < startDate || referenceDate > endDate) continue;
            const values = [row.opening_price, row.high_price, row.low_price, row.trade_price, row.candle_acc_trade_volume].map(dec);
            if (values.some((value) => value === null)) throw new Error("Invalid Bithumb OHLCV values");
            prices.push({ sourceAssetId: market, referenceDate, referenceTimezone: "Asia/Seoul", priceKind: "close", open: values[0], high: values[1], low: values[2], close: values[3], volume: values[4], marketCap: null, isAdjusted: false, fetchedAt, sourceUpdatedAt: null });
          }
          const oldest = rows.at(-1)?.candle_date_time_kst?.slice(0, 10);
          if (!isValidMarketDate(oldest) || oldest >= cursor || rows.length < 200) break;
          cursor = new Date(Date.parse(`${oldest}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
        }
      }
      return { assets, prices, snapshotVersion: fetchedAt };
    },
  };
}
