import { countFinancialCompanyFacts, getFinancialDataStatus, getFinancialHistory, getFinancialOverview, getSecCompanyFactsCollectionStatus, listFinancialCompanyFacts, listFinancialMarketAssets } from "@/lib/db/financial-queries";
import { classifyFinancialDatabaseError } from "./financial-db-error.mjs";
import { isIP } from "node:net";
import { allowFinancialRequest } from "./financial-rate-limit.mjs";
import { financialApiErrorResponse, financialApiResponse, financialRateLimitResponse, parseFinancialCompanyFactsQuery, parseFinancialHeatmapQuery, parseFinancialHistoryQuery, parseFinancialListQuery, safeErrorCode } from "./financial-api.mjs";
import { createFinancialResponseCache, secFactsCacheVersion } from "./financial-response-cache.mjs";

const companyFactsResponseCache = createFinancialResponseCache();

export function financialRateLimit(request: Request) {
  const forwarded = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "anonymous";
  const clientId = isIP(forwarded) ? forwarded : "anonymous";
  const decision = allowFinancialRequest(clientId);
  return decision.allowed ? null : financialRateLimitResponse(decision.retryAfterSeconds);
}

export async function financialListRoute(request: Request, type: string) {
  const throttled = financialRateLimit(request);
  if (throttled) return throttled;
  const parsed = parseFinancialListQuery(new URL(request.url).searchParams, type);
  if (!parsed.ok) return financialApiResponse({ error: parsed.error }, parsed.status);
  try {
    const result = await listFinancialMarketAssets({ type, market: parsed.market, search: parsed.search, sort: parsed.sort, order: parsed.order, limit: parsed.pageSize, offset: parsed.offset, referenceDate: parsed.referenceDate });
    return financialApiResponse({ data: result.rows, pagination: { page: parsed.page, pageSize: parsed.pageSize, total: result.total }, asOf: result.rows.reduce<Date | null>((latest, row) => {
      const candidate = row.quoteFetchedAt && (!latest || new Date(row.quoteFetchedAt) > latest) ? new Date(row.quoteFetchedAt) : row.fetchedAt && (!latest || new Date(row.fetchedAt) > latest) ? new Date(row.fetchedAt) : latest;
      return candidate;
    }, null) });
  } catch (error) {
    const reason = classifyFinancialDatabaseError(error);
    console.error("Financial market read failed", reason, safeErrorCode(error));
    return financialApiErrorResponse(reason);
  }
}

export async function financialOverviewRoute(request: Request) {
  const throttled = financialRateLimit(request);
  if (throttled) return throttled;
  try {
    const [markets, dataStatus] = await Promise.all([getFinancialOverview(), getFinancialDataStatus()]);
    return financialApiResponse({ markets, dataStatus });
  } catch (error) {
    const reason = classifyFinancialDatabaseError(error);
    console.error("Financial overview read failed", reason, safeErrorCode(error));
    return financialApiErrorResponse(reason);
  }
}

export async function financialCompanyFactsRoute(request: Request) {
  const throttled = financialRateLimit(request);
  if (throttled) return throttled;
  try {
    const parsed = parseFinancialCompanyFactsQuery(new URL(request.url).searchParams);
    if (!parsed.ok) return financialApiResponse({ error: parsed.error }, parsed.status);
    const filters = { ticker: parsed.ticker, period: parsed.period, latest: parsed.latest, fiscalYear: parsed.fiscalYear };
    const collectionStatus = await getSecCompanyFactsCollectionStatus();
    const cacheKey = JSON.stringify({ version: secFactsCacheVersion(collectionStatus), ...filters, pageSize: parsed.pageSize, offset: parsed.offset });
    const cached = await companyFactsResponseCache.get(cacheKey, async () => {
      const [rows, total] = await Promise.all([listFinancialCompanyFacts(parsed.pageSize, parsed.offset, filters), countFinancialCompanyFacts(filters)]);
      const asOf = rows.reduce<string | null>((latest, row) => typeof row.filedDate === "string" && (!latest || row.filedDate > latest) ? row.filedDate : latest, null);
      const dataObservedAt = rows.reduce<Date | null>((latest, row) => {
        const candidate = row.dataObservedAt instanceof Date ? row.dataObservedAt : row.dataObservedAt ? new Date(String(row.dataObservedAt)) : null;
        return candidate && !Number.isNaN(candidate.valueOf()) && (!latest || candidate > latest) ? candidate : latest;
      }, null);
      return { data: rows, pagination: { page: parsed.page, pageSize: parsed.pageSize, total }, source: rows[0]?.sourceName ?? "U.S. SEC EDGAR Company Facts", asOf, dataObservedAt, collectionStatus, dataState: total ? "available" : "no-company-facts" };
    });
    return financialApiResponse(cached.value, 200, {
      cacheControl: "public, max-age=120, stale-while-revalidate=60",
      headers: { "x-financial-cache": cached.state },
    });
  } catch (error) {
    const reason = classifyFinancialDatabaseError(error);
    console.error("Financial company-facts read failed", reason, safeErrorCode(error));
    return financialApiErrorResponse(reason);
  }
}

export async function financialHeatmapRoute(request: Request, type: "stock" | "crypto") {
  const throttled = financialRateLimit(request);
  if (throttled) return throttled;
  const parsed = parseFinancialHeatmapQuery(new URL(request.url).searchParams, type);
  if (!parsed.ok) return financialApiResponse({ error: parsed.error }, parsed.status);
  try {
    const result = await listFinancialMarketAssets({ type, market: parsed.market, referenceDate: parsed.referenceDate, sort: "marketCap", order: "desc", limit: 100, offset: 0, visualization: true });
    const rows = result.rows as Array<{ currency: string; venue: string; marketCap: string | null }>;
    const oneMarket = rows.length > 0 && rows.every((row) => row.currency === rows[0].currency && row.venue === rows[0].venue);
    const completeSizeData = rows.length > 0 && rows.every((row) => row.marketCap !== null && Number(row.marketCap) > 0);
    return financialApiResponse({
      available: result.total <= 100 && oneMarket && completeSizeData,
      reason: result.total > 100 ? "market_cap_result_capped" : !oneMarket ? "multiple_market_sources" : !completeSizeData ? "market_cap_incomplete" : null,
      market: parsed.market,
      source: rows[0]?.venue ?? null,
      total: result.total,
      data: result.total <= 100 && oneMarket && completeSizeData ? rows : [],
    });
  } catch (error) {
    const reason = classifyFinancialDatabaseError(error);
    console.error("Financial heatmap read failed", reason, safeErrorCode(error));
    return financialApiErrorResponse(reason);
  }
}

export async function financialHistoryRoute(request: Request, assetId: string) {
  const throttled = financialRateLimit(request);
  if (throttled) return throttled;
  const parsed = parseFinancialHistoryQuery(new URL(request.url).searchParams, assetId);
  if (!parsed.ok) return financialApiResponse({ error: parsed.error }, parsed.status);
  try {
    const history = await getFinancialHistory(assetId, parsed);
    return financialApiResponse({ data: history, pagination: { limit: parsed.limit, returned: history.length } });
  } catch (error) {
    const reason = classifyFinancialDatabaseError(error);
    console.error("Financial history read failed", reason, safeErrorCode(error));
    return financialApiErrorResponse(reason);
  }
}
