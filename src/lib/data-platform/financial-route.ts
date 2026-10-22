import { getFinancialHistory, getFinancialOverview, listFinancialMarketAssets } from "@/lib/db/financial-queries";
import { isIP } from "node:net";
import { allowFinancialRequest } from "./financial-rate-limit.mjs";
import { financialApiErrorResponse, financialApiResponse, financialRateLimitResponse, parseFinancialHeatmapQuery, parseFinancialHistoryQuery, parseFinancialListQuery, safeErrorCode } from "./financial-api.mjs";

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
    return financialApiResponse({ data: result.rows, pagination: { page: parsed.page, pageSize: parsed.pageSize, total: result.total }, asOf: result.rows.reduce<Date | null>((latest, row) => row.fetchedAt && (!latest || new Date(row.fetchedAt) > latest) ? new Date(row.fetchedAt) : latest, null) });
  } catch (error) {
    console.error("Financial market read failed", safeErrorCode(error));
    return financialApiErrorResponse();
  }
}

export async function financialOverviewRoute(request: Request) {
  const throttled = financialRateLimit(request);
  if (throttled) return throttled;
  try {
    return financialApiResponse({ markets: await getFinancialOverview() });
  } catch (error) {
    console.error("Financial overview read failed", safeErrorCode(error));
    return financialApiErrorResponse();
  }
}

export async function financialHeatmapRoute(request: Request, type: "stock" | "crypto") {
  const throttled = financialRateLimit(request);
  if (throttled) return throttled;
  const parsed = parseFinancialHeatmapQuery(new URL(request.url).searchParams, type);
  if (!parsed.ok) return financialApiResponse({ error: parsed.error }, parsed.status);
  try {
    const result = await listFinancialMarketAssets({ type, market: parsed.market, referenceDate: parsed.referenceDate, sort: "marketCap", order: "desc", limit: 100, offset: 0 });
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
    console.error("Financial heatmap read failed", safeErrorCode(error));
    return financialApiErrorResponse();
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
    console.error("Financial history read failed", safeErrorCode(error));
    return financialApiErrorResponse();
  }
}
