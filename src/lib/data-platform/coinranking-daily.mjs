import { validateMarketPriceRecord } from "./financial-market.mjs";

export const COINRANKING_SOURCE_ID = "coinranking-aggregate";
export const COINRANKING_DATASET_ID = "coinranking-usd-daily-snapshots";
export const COINRANKING_DAILY_LIMIT = 300;
export const COINRANKING_MONTHLY_REQUEST_BUDGET = 8_000;
export const COINRANKING_REFERENCE_TIMEZONE = "UTC";

/**
 * Coinranking returns aggregate observations, not finalized exchange candles.
 * The shared `close` column stores the captured price; priceKind marks its
 * semantics as an observed 24h quote and OHLC fields are intentionally null.
 */
export function normalizeCoinrankingDailySnapshot(snapshot) {
  if (!snapshot || snapshot.provider !== "Coinranking" || snapshot.currency !== "USD"
    || snapshot.quoteType !== "daily-observed-aggregate-price" || snapshot.quoteWindow !== "24h"
    || !Number.isInteger(snapshot.requestCount) || snapshot.requestCount < 1 || snapshot.requestCount > 3
    || !Number.isFinite(Date.parse(snapshot.observedAt)) || !Array.isArray(snapshot.data)
    || snapshot.data.length < 1 || snapshot.data.length > COINRANKING_DAILY_LIMIT) {
    throw new Error("Coinranking snapshot does not match the reviewed daily collection contract.");
  }
  const fetchedAt = new Date(snapshot.observedAt).toISOString();
  const referenceDate = fetchedAt.slice(0, 10);
  const sourceAssetIds = new Set();
  const assets = [];
  const prices = [];
  for (const coin of snapshot.data) {
    if (!coin || typeof coin.uuid !== "string" || !/^[A-Za-z0-9_-]{1,180}$/.test(coin.uuid)
      || sourceAssetIds.has(coin.uuid) || typeof coin.name !== "string" || !coin.name.trim()
      || typeof coin.symbol !== "string" || !/^[A-Z0-9._-]{1,40}$/.test(coin.symbol)
      || typeof coin.price !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(coin.price) || Number(coin.price) <= 0
      || typeof coin.marketCap !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(coin.marketCap) || Number(coin.marketCap) <= 0
      || coin.volume24h != null && (typeof coin.volume24h !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(coin.volume24h) || Number(coin.volume24h) < 0)
      || coin.change24hPercent != null && (typeof coin.change24hPercent !== "string" || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(coin.change24hPercent))) {
      throw new Error("Coinranking snapshot contains a malformed asset or quote field.");
    }
    sourceAssetIds.add(coin.uuid);
    const asset = {
      sourceAssetId: coin.uuid,
      assetType: "crypto",
      symbol: coin.symbol,
      name: coin.name.trim(),
      venue: "coinranking-aggregate",
      currency: "USD",
      unit: "aggregate-price",
      timezone: COINRANKING_REFERENCE_TIMEZONE,
      isActive: true,
      metadata: { quoteType: "daily-observed-aggregate-price", quoteWindow: "24h" },
    };
    const price = {
      sourceAssetId: coin.uuid,
      referenceDate,
      referenceTimezone: COINRANKING_REFERENCE_TIMEZONE,
      priceKind: "quote-24h",
      open: null,
      high: null,
      low: null,
      close: coin.price,
      volume: coin.volume24h ?? null,
      marketCap: coin.marketCap,
      quoteChangePercent: coin.change24hPercent ?? null,
      quoteWindow: "24h",
      isAdjusted: false,
      fetchedAt,
      sourceUpdatedAt: null,
    };
    const validation = validateMarketPriceRecord({ ...price, assetId: coin.uuid, sourceId: COINRANKING_SOURCE_ID, datasetId: COINRANKING_DATASET_ID });
    if (!validation.ok) throw new Error(`Coinranking observation failed financial validation: ${validation.reason}.`);
    assets.push(asset);
    prices.push(price);
  }
  return {
    schemaVersion: 1,
    sourceId: COINRANKING_SOURCE_ID,
    datasetId: COINRANKING_DATASET_ID,
    snapshotVersion: referenceDate,
    snapshotType: "daily-observed-aggregate-price",
    referenceDate,
    currency: "USD",
    attribution: snapshot.attribution,
    sourceUrl: snapshot.sourceUrl,
    observedAt: fetchedAt,
    apiRequests: snapshot.requestCount,
    rejectedAssets: Array.isArray(snapshot.rejectedAssets) ? snapshot.rejectedAssets : [],
    assets,
    prices,
  };
}

export function canReserveCoinrankingRequests({ usedThisMonth, requested, budget = COINRANKING_MONTHLY_REQUEST_BUDGET }) {
  return Number.isInteger(usedThisMonth) && usedThisMonth >= 0
    && Number.isInteger(requested) && requested > 0
    && Number.isInteger(budget) && budget > 0
    && usedThisMonth + requested <= budget;
}
