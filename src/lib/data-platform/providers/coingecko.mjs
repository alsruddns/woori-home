import { isValidMarketDate } from "../financial-market.mjs";

const COINS = [["bitcoin", "BTC", "Bitcoin"], ["ethereum", "ETH", "Ethereum"], ["ripple", "XRP", "XRP"], ["solana", "SOL", "Solana"], ["binancecoin", "BNB", "BNB"], ["dogecoin", "DOGE", "Dogecoin"], ["cardano", "ADA", "Cardano"], ["tron", "TRX", "TRON"]];
const dec = (value) => {
  if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value.toString();
  return null;
};
const signedDec = (value) => {
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value)) return value.toString();
  return null;
};
function apiError(response) { return Object.assign(new Error("CoinGecko API request failed"), { status: response.status, retryAfterMs: Number(response.headers.get("retry-after")) * 1000 || undefined }); }

export function createCoinGeckoProvider({ apiKey = process.env.COINGECKO_API_KEY, fetchImpl = fetch, now = () => new Date(), wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  async function get(path, params = {}, signal) {
    if (!apiKey) throw Object.assign(new Error("CoinGecko API key is not configured"), { code: "provider-not-configured" });
    const url = new URL(`https://api.coingecko.com/api/v3${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    const response = await fetchImpl(url, { headers: { accept: "application/json", "x-cg-demo-api-key": apiKey }, signal });
    if (!response.ok) throw apiError(response);
    return response.json();
  }
  return {
    id: "coingecko-markets", datasetId: "coingecko-usd-daily-prices", providerName: "CoinGecko API (global aggregate)",
    sourceUrl: "https://www.coingecko.com/en/api", attribution: "Data provided by CoinGecko", assetType: "crypto", market: "usd", marketTimezone: "UTC", licenseStatus: "unverified",
    async fetchMarkets() { return COINS.map(([id, symbol, name]) => ({ market: `CG-${id}-USD`, id, symbol, name, quoteCurrency: "USD", baseCurrency: symbol, venue: "coingecko-global-aggregate" })); },
    async fetchTickers(markets = COINS.map(([id]) => `CG-${id}-USD`), { signal } = {}) {
      const ids = [...new Set(markets)].map((market) => market.match(/^CG-(.+)-USD$/)?.[1]).filter((id) => COINS.some(([coin]) => coin === id));
      if (!ids.length) return [];
      const rows = await get("/coins/markets", { vs_currency: "usd", ids: ids.join(","), per_page: ids.length, page: 1, price_change_percentage: "24h" }, signal);
      if (!Array.isArray(rows)) throw new Error("Invalid CoinGecko markets payload");
      return rows.map((row) => ({ market: `CG-${row.id}-USD`, symbol: row.symbol?.toUpperCase(), venue: "coingecko-global-aggregate", currency: "USD", price: dec(row.current_price),
        change24hPercent: signedDec(row.price_change_percentage_24h), volume24h: dec(row.total_volume), marketCap: dec(row.market_cap), asOf: typeof row.last_updated === "string" && Number.isFinite(Date.parse(row.last_updated)) ? new Date(row.last_updated).toISOString() : null }));
    },
    async fetchDailyPrices({ startDate, endDate, signal, limit = COINS.length }) {
      if (!isValidMarketDate(startDate) || !isValidMarketDate(endDate) || startDate > endDate) throw new Error("Invalid CoinGecko date range");
      const assets = [], prices = [], fetchedAt = now().toISOString();
      for (const [id, symbol, name] of COINS.slice(0, Math.max(1, Math.min(COINS.length, Math.trunc(Number(limit) || COINS.length))))) {
        assets.push({ sourceAssetId: `CG-${id}-USD`, assetType: "crypto", symbol, name, venue: "coingecko-global-aggregate", countryCode: null, currency: "USD", unit: "coin", timezone: "UTC", metadata: { providerCoinId: id, aggregation: "global" } });
        const from = Math.floor(Date.parse(`${startDate}T00:00:00Z`) / 1000);
        const to = Math.floor(Date.parse(`${endDate}T23:59:59Z`) / 1000);
        const response = await get(`/coins/${id}/market_chart/range`, { vs_currency: "usd", from, to }, signal);
        if (!Array.isArray(response.prices)) throw new Error("Invalid CoinGecko market chart payload");
        const daily = new Map();
        const series = (items) => new Map((Array.isArray(items) ? items : []).filter((item) => Array.isArray(item) && Number.isFinite(item[0])).map(([timestamp, value]) => [new Date(timestamp).toISOString().slice(0, 10), dec(value)]));
        const marketCaps = series(response.market_caps), volumes = series(response.total_volumes);
        for (const [timestamp, value] of response.prices) {
          const referenceDate = new Date(timestamp).toISOString().slice(0, 10);
          if (!isValidMarketDate(referenceDate) || referenceDate < startDate || referenceDate > endDate) continue;
          const close = dec(value);
          if (close === null) continue;
          daily.set(referenceDate, close);
        }
        for (const [referenceDate, close] of daily) prices.push({ sourceAssetId: `CG-${id}-USD`, referenceDate, referenceTimezone: "UTC", priceKind: "close", open: null, high: null, low: null, close, volume: volumes.get(referenceDate) ?? null, marketCap: marketCaps.get(referenceDate) ?? null, isAdjusted: false, fetchedAt, sourceUpdatedAt: null });
        await wait(1200);
      }
      return { assets, prices, snapshotVersion: fetchedAt };
    },
  };
}
