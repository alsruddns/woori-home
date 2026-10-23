const SYMBOLS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"];
const NAMES = { AAPL: "Apple Inc.", MSFT: "Microsoft Corporation", NVDA: "NVIDIA Corporation", GOOGL: "Alphabet Inc.", AMZN: "Amazon.com, Inc.", META: "Meta Platforms, Inc.", TSLA: "Tesla, Inc." };
const dec = (value) => typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value) ? value : null;
const signedDec = (value) => typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value) ? value : null;

export function createTwelveDataUsProvider({ apiKey = process.env.TWELVEDATA_API_KEY, fetchImpl = fetch, now = () => new Date(), wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  async function request(endpoint, params, signal) {
    if (!apiKey) throw Object.assign(new Error("Twelve Data API key is not configured"), { code: "provider-not-configured" });
    const url = new URL(`https://api.twelvedata.com/${endpoint}`);
    for (const [key, value] of Object.entries({ ...params, apikey: apiKey })) url.searchParams.set(key, String(value));
    const response = await fetchImpl(url, { headers: { accept: "application/json" }, signal });
    if (!response.ok) throw Object.assign(new Error("Twelve Data request failed"), { status: response.status, retryAfterMs: Number(response.headers.get("retry-after")) * 1000 || undefined });
    const body = await response.json();
    if (body.status === "error") throw Object.assign(new Error("Twelve Data returned an error"), { status: body.code === 4290 ? 429 : 400 });
    return body;
  }
  return {
    id: "twelvedata-us-equities", datasetId: "twelvedata-us-daily-prices", providerName: "Twelve Data US Equities",
    sourceUrl: "https://twelvedata.com/docs", attribution: "Data provided by Twelve Data",
    assetType: "stock", market: "us", marketTimezone: "America/New_York", licenseStatus: "unverified",
    async fetchMarkets() { return SYMBOLS.map((symbol) => ({ market: symbol, symbol, name: NAMES[symbol], quoteCurrency: "USD", baseCurrency: symbol, venue: "NASDAQ/NYSE" })); },
    async fetchTickers(markets = SYMBOLS, { signal } = {}) {
      const out = [];
      for (const symbol of [...new Set(markets)].filter((value) => SYMBOLS.includes(value))) {
        const row = await request("quote", { symbol }, signal);
        const percent = signedDec(row.percent_change);
        out.push({ market: symbol, symbol, venue: row.exchange ?? "US", currency: row.currency ?? "USD", price: dec(row.close),
          previousClose: dec(row.previous_close), changePercent: percent, changeWindow: "session", volume24h: dec(row.volume), marketCap: dec(row.market_cap), asOf: row.timestamp ? new Date(row.timestamp).toISOString() : null });
        await wait(1000);
      }
      return out;
    },
    async fetchDailyPrices({ startDate, endDate, signal, limit = SYMBOLS.length }) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) throw new Error("Invalid Twelve Data date range");
      const assets = [], prices = [], fetchedAt = now().toISOString();
      for (const symbol of SYMBOLS.slice(0, Math.max(1, Math.min(SYMBOLS.length, Math.trunc(Number(limit) || SYMBOLS.length))))) {
        assets.push({ sourceAssetId: symbol, assetType: "stock", symbol, name: NAMES[symbol], venue: "us-equities", countryCode: "US", currency: "USD", unit: "share", timezone: "America/New_York", sector: null, metadata: {} });
        const response = await request("time_series", { symbol, interval: "1day", start_date: startDate, end_date: endDate, order: "ASC", timezone: "America/New_York", outputsize: 5000, format: "JSON" }, signal);
        if (!Array.isArray(response.values)) throw new Error("Invalid Twelve Data daily time series");
        for (const row of response.values) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(row.datetime)) throw new Error("Invalid Twelve Data candle date");
          const values = [row.open, row.high, row.low, row.close, row.volume].map(dec);
          if (values.slice(0, 4).some((value) => value === null)) throw new Error("Invalid Twelve Data OHLC values");
          prices.push({ sourceAssetId: symbol, referenceDate: row.datetime, referenceTimezone: "America/New_York", priceKind: "close", open: values[0], high: values[1], low: values[2], close: values[3], volume: values[4], marketCap: null, isAdjusted: false, fetchedAt, sourceUpdatedAt: null });
        }
        await wait(1000);
      }
      return { assets, prices, snapshotVersion: fetchedAt };
    },
  };
}
