import { isValidMarketDate } from "../financial-market.mjs";

const BASE_URL = "https://api.upbit.com/v1";
const ASSETS = [
  ["BTC", "Bitcoin"], ["ETH", "Ethereum"], ["XRP", "XRP"], ["SOL", "Solana"],
  ["BNB", "BNB"], ["DOGE", "Dogecoin"], ["ADA", "Cardano"], ["TRX", "TRON"],
];

function utcBoundaryForKoreanDate(date, nextDay = false) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + (nextDay ? 1 : 0), -9)).toISOString();
}

function decimal(value) {
  if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return String(value);
  return null;
}

function responseError(status, retryAfter) {
  const seconds = Number(retryAfter);
  return Object.assign(new Error("Upbit quotation request failed"), {
    status,
    retryAfterMs: Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined,
  });
}

/**
 * Adapter for Upbit KRW daily candles. Access to the public quotation API does
 * not itself approve external display, retention, or redistribution; callers
 * must gate collection on a separately reviewed DB source record.
 */
export function createUpbitKrwDailyProvider({ fetchImpl = fetch, now = () => new Date(), wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  async function requestJson(path, params, signal) {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, String(value));
    const response = await fetchImpl(url, { headers: { accept: "application/json" }, signal });
    if (!response.ok) throw responseError(response.status, response.headers.get("retry-after"));
    return response.json();
  }
  return {
    id: "upbit-quotation",
    datasetId: "upbit-krw-daily-candles",
    providerName: "Upbit Quotation API",
    sourceUrl: "https://docs.upbit.com/kr/reference",
    attribution: "Source: Upbit KRW market quotation data",
    assetType: "crypto",
    market: "krw",
    marketTimezone: "Asia/Seoul",
    licenseStatus: "unverified",
    async fetchMarkets({ signal } = {}) {
      const rows = await requestJson("/market/all", { isDetails: "true" }, signal);
      if (!Array.isArray(rows)) throw new Error("Invalid Upbit market payload");
      return rows.filter((row) => typeof row.market === "string" && row.market.startsWith("KRW-") && typeof row.korean_name === "string")
        .map((row) => ({ market: row.market, symbol: row.market.slice(4), name: row.korean_name, quoteCurrency: "KRW", baseCurrency: row.market.slice(4), venue: "upbit", warning: row.market_warning === "CAUTION" }));
    },
    async fetchTickers(markets, { signal } = {}) {
      const unique = [...new Set(markets)].filter((market) => /^KRW-[A-Z0-9]+$/.test(market));
      const output = [];
      for (let offset = 0; offset < unique.length; offset += 100) {
        const batch = unique.slice(offset, offset + 100);
        const rows = await requestJson("/ticker", { markets: batch.join(",") }, signal);
        if (!Array.isArray(rows)) throw new Error("Invalid Upbit ticker payload");
        for (const row of rows) {
          if (!batch.includes(row.market)) throw new Error("Upbit returned a ticker for an unrequested market");
          const price = decimal(row.trade_price);
          const change24hPercent = Number(row.signed_change_rate) * 100;
          output.push({ market: row.market, symbol: row.market.slice(4), venue: "upbit", currency: "KRW", price,
            change24hPercent: Number.isFinite(change24hPercent) ? String(change24hPercent) : null,
            volume24h: decimal(row.acc_trade_volume_24h), quoteVolume24h: decimal(row.acc_trade_price_24h),
            asOf: typeof row.timestamp === "number" ? new Date(row.timestamp).toISOString() : null });
        }
      }
      return output;
    },
    async fetchDailyPrices({ startDate, endDate, signal, limit = ASSETS.length }) {
      if (!isValidMarketDate(startDate) || !isValidMarketDate(endDate) || startDate > endDate) throw new Error("Invalid Upbit date range");
      const assets = [];
      const prices = [];
      const fetchedAt = now().toISOString();

      const boundedLimit = Math.max(1, Math.min(ASSETS.length, Math.trunc(Number(limit) || ASSETS.length)));
      for (const [symbol, name] of ASSETS.slice(0, boundedLimit)) {
        const market = `KRW-${symbol}`;
        assets.push({ sourceAssetId: market, assetType: "crypto", symbol, name, venue: "upbit-krw", countryCode: "KR", currency: "KRW", unit: "coin", timezone: "Asia/Seoul", metadata: { market } });

        let cursor = utcBoundaryForKoreanDate(endDate, true);
        let finished = false;
        let pageCount = 0;
        while (!finished && pageCount < 19) {
          await wait(110);
          const body = await requestJson("/candles/days", { market, to: cursor, count: 200 }, signal);
          if (!Array.isArray(body)) throw new Error("Invalid Upbit candle payload");
          pageCount += 1;
          if (body.length === 0) break;

          for (const candle of body) {
            if (candle?.market !== market) throw new Error("Upbit returned a candle for a different market");
            const referenceDate = candle?.candle_date_time_kst?.slice(0, 10);
            if (!isValidMarketDate(referenceDate)) throw new Error("Invalid Upbit candle date");
            if (referenceDate < startDate || referenceDate > endDate) continue;
            const open = decimal(candle.opening_price);
            const high = decimal(candle.high_price);
            const low = decimal(candle.low_price);
            const close = decimal(candle.trade_price);
            const volume = decimal(candle.candle_acc_trade_volume);
            if ([open, high, low, close, volume].some((value) => value === null)) throw new Error("Invalid Upbit candle values");
            prices.push({ sourceAssetId: market, referenceDate, referenceTimezone: "Asia/Seoul", priceKind: "close", open, high, low, close, volume, marketCap: null, isAdjusted: false, fetchedAt, sourceUpdatedAt: null });
          }

          const oldest = body.at(-1)?.candle_date_time_utc;
          const oldestTime = Date.parse(`${oldest}Z`);
          if (!Number.isFinite(oldestTime)) throw new Error("Invalid Upbit candle cursor");
          const nextCursor = new Date(oldestTime - 1).toISOString();
          if (nextCursor >= cursor) throw new Error("Upbit candle pagination did not advance");
          cursor = nextCursor;
          if (referenceFloor(body.at(-1)?.candle_date_time_kst) <= startDate || body.length < 200) finished = true;
        }
      }

      return { assets, prices, snapshotVersion: fetchedAt };
    },
  };
}

function referenceFloor(value) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

export const upbitKrwAssets = ASSETS.map(([symbol, name]) => ({ symbol, name, market: `KRW-${symbol}` }));
