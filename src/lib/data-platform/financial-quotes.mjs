import { isValidMarketDate } from "./financial-market.mjs";

const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const positive = (value) => typeof value === "string" && DECIMAL.test(value) && Number(value) > 0;
const optionalNonnegative = (value) => value == null || typeof value === "string" && DECIMAL.test(value) && Number(value) >= 0;

function localDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function normalizeCurrentQuoteRows(assets, quotes, { fetchedAt = new Date().toISOString(), maxAgeMs = 4 * 86_400_000, futureToleranceMs = 5 * 60_000 } = {}) {
  if (!Array.isArray(assets) || !Array.isArray(quotes) || !Number.isFinite(Date.parse(fetchedAt))) throw new Error("Invalid current-quote input");
  const byMarket = new Map();
  for (const asset of assets) {
    const key = asset.metadata?.market ?? asset.sourceAssetId;
    if (byMarket.has(key)) throw new Error("Duplicate asset market in current-quote snapshot");
    byMarket.set(key, asset);
    byMarket.set(asset.sourceAssetId, asset);
  }
  const seen = new Set();
  return quotes.map((quote) => {
    const asset = byMarket.get(quote.market) ?? byMarket.get(quote.symbol);
    if (!asset) throw new Error("Current quote does not match an asset in its exchange snapshot");
    if (seen.has(asset.sourceAssetId)) throw new Error("Duplicate current quote for an asset");
    seen.add(asset.sourceAssetId);
    if (quote.currency !== asset.currency || !positive(quote.price)) throw new Error("Current quote price or currency failed validation");
    if (!optionalNonnegative(quote.volume24h ?? quote.volume) || !optionalNonnegative(quote.marketCap)) throw new Error("Current quote volume or market cap failed validation");
    if (quote.asOf != null && !Number.isFinite(Date.parse(quote.asOf))) throw new Error("Current quote source timestamp failed validation");
    const asOf = quote.asOf == null ? null : new Date(quote.asOf).toISOString();
    const observedAt = asOf ?? fetchedAt;
    const age = Date.parse(fetchedAt) - Date.parse(observedAt);
    if (age < -futureToleranceMs || age > maxAgeMs) throw new Error("Current quote failed data-freshness validation");
    const referenceDate = localDate(new Date(observedAt), asset.timezone);
    if (!isValidMarketDate(referenceDate)) throw new Error("Current quote date failed validation");
    const window = quote.change24hPercent != null ? "24h" : quote.changePercent != null ? "session" : quote.changeWindow === "session" ? "session" : "24h";
    const change = quote.change24hPercent ?? quote.changePercent ?? null;
    if (change != null && (typeof change !== "string" || !DECIMAL.test(change))) throw new Error("Current quote change failed validation");
    return { sourceAssetId: asset.sourceAssetId, referenceDate, referenceTimezone: asset.timezone, priceKind: `quote-${window}`,
      open: null, high: null, low: null, close: quote.price, volume: quote.volume24h ?? quote.volume ?? null, marketCap: quote.marketCap ?? null,
      quoteChangePercent: change, quoteWindow: window, isAdjusted: false, fetchedAt, sourceUpdatedAt: asOf };
  });
}
