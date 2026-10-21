import "server-only";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { getDatabase } from "./index";
import { dataSources, financialAssets, financialDailyPrices } from "./schema";

export type FinancialAssetFilter = { assetType?: string; countryCode?: string; symbol?: string };

/** Expose only sources whose recorded rights status has been reviewed as verified. */
export async function listFinancialAssets(filter: FinancialAssetFilter = {}) {
  const conditions = [eq(dataSources.licenseStatus, "verified")];
  if (filter.assetType) conditions.push(eq(financialAssets.assetType, filter.assetType));
  if (filter.countryCode) conditions.push(eq(financialAssets.countryCode, filter.countryCode));
  if (filter.symbol) conditions.push(eq(financialAssets.symbol, filter.symbol));
  return getDatabase().select({
    id: financialAssets.id, assetType: financialAssets.assetType, symbol: financialAssets.symbol,
    name: financialAssets.name, venue: financialAssets.venue, countryCode: financialAssets.countryCode,
    currency: financialAssets.currency, unit: financialAssets.unit, timezone: financialAssets.timezone,
    sourceId: dataSources.id, sourceName: dataSources.name, sourceUrl: dataSources.sourceUrl,
    attribution: dataSources.attribution,
  }).from(financialAssets).innerJoin(dataSources, eq(dataSources.id, financialAssets.sourceId))
    .where(and(...conditions)).orderBy(asc(financialAssets.assetType), asc(financialAssets.symbol)).limit(500);
}

export async function getFinancialPriceHistory(assetId: string, options: { from?: string; to?: string; limit?: number } = {}) {
  const conditions = [eq(financialDailyPrices.assetId, assetId), eq(dataSources.licenseStatus, "verified")];
  if (options.from) conditions.push(gte(financialDailyPrices.referenceDate, options.from));
  if (options.to) conditions.push(lte(financialDailyPrices.referenceDate, options.to));
  const limit = Math.min(1000, Math.max(1, Math.trunc(options.limit ?? 370)));
  return getDatabase().select({
    referenceDate: financialDailyPrices.referenceDate, referenceTimezone: financialDailyPrices.referenceTimezone,
    priceKind: financialDailyPrices.priceKind, open: financialDailyPrices.open, high: financialDailyPrices.high,
    low: financialDailyPrices.low, close: financialDailyPrices.close, volume: financialDailyPrices.volume,
    marketCap: financialDailyPrices.marketCap, isAdjusted: financialDailyPrices.isAdjusted,
    fetchedAt: financialDailyPrices.fetchedAt, sourceId: dataSources.id, sourceName: dataSources.name,
    sourceUrl: dataSources.sourceUrl, attribution: dataSources.attribution,
  }).from(financialDailyPrices).innerJoin(dataSources, eq(dataSources.id, financialDailyPrices.sourceId))
    .where(and(...conditions)).orderBy(desc(financialDailyPrices.referenceDate)).limit(limit);
}

export async function getLatestFinancialReferenceDate(assetId: string) {
  const [latest] = await getDatabase().select({ referenceDate: financialDailyPrices.referenceDate })
    .from(financialDailyPrices).innerJoin(dataSources, eq(dataSources.id, financialDailyPrices.sourceId))
    .where(and(eq(financialDailyPrices.assetId, assetId), eq(dataSources.licenseStatus, "verified")))
    .orderBy(desc(financialDailyPrices.referenceDate)).limit(1);
  return latest?.referenceDate ?? null;
}
