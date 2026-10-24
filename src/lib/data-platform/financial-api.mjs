export const FINANCIAL_API_CACHE_CONTROL = "no-store";

const ASSET_TYPES = new Set(["stock", "crypto", "index", "metal", "energy", "agriculture", "fx", "rate"]);
const SORT_COLUMNS = new Set(["symbol", "name", "close", "changePercent", "quoteChangePercent", "volume", "marketCap"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function positiveInteger(value, fallback, maximum) {
  if (value == null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) return null;
  return Math.min(number, maximum);
}

export function parseFinancialListQuery(searchParams, type) {
  if (!ASSET_TYPES.has(type)) return { ok: false, status: 400, error: "invalid_asset_type" };
  const page = positiveInteger(searchParams.get("page"), 1, 1000);
  const pageSize = positiveInteger(searchParams.get("pageSize"), 50, 100);
  const sort = searchParams.get("sort") ?? "symbol";
  const order = searchParams.get("order") ?? "asc";
  const market = searchParams.get("market");
  const search = (searchParams.get("q") ?? "").trim();
  const referenceDate = searchParams.get("date");
  if (!page || !pageSize || !SORT_COLUMNS.has(sort) || !["asc", "desc"].includes(order) || search.length > 80 || (referenceDate && (!DATE_PATTERN.test(referenceDate) || !validDate(referenceDate)))) return { ok: false, status: 400, error: "invalid_query" };
  if (market && !["us", "kr", "krw", "usd", "usdt"].includes(market)) return { ok: false, status: 400, error: "invalid_market" };
  if (type === "stock" && market && !["us", "kr"].includes(market)) return { ok: false, status: 400, error: "invalid_market_for_asset_type" };
  if (type === "crypto" && market && !["krw", "usd", "usdt"].includes(market)) return { ok: false, status: 400, error: "invalid_market_for_asset_type" };
  return { ok: true, page, pageSize, offset: (page - 1) * pageSize, sort, order, market, search, referenceDate };
}

export function parseFinancialHistoryQuery(searchParams, assetId) {
  if (!UUID_PATTERN.test(assetId)) return { ok: false, status: 400, error: "invalid_asset_id" };
  const limit = positiveInteger(searchParams.get("limit"), 100, 1000);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!limit || (from && (!DATE_PATTERN.test(from) || !validDate(from))) || (to && (!DATE_PATTERN.test(to) || !validDate(to))) || (from && to && from > to)) return { ok: false, status: 400, error: "invalid_history_range" };
  return { ok: true, limit, from, to };
}

export function parseFinancialCompanyFactsQuery(searchParams) {
  const page = positiveInteger(searchParams.get("page"), 1, 10000);
  const pageSize = positiveInteger(searchParams.get("pageSize"), 100, 200);
  const period = searchParams.get("period");
  const rawTicker = searchParams.get("ticker");
  const ticker = rawTicker?.trim().toUpperCase() ?? null;
  const rawLatest = searchParams.get("latest");
  const latest = rawLatest === "true" || rawLatest === "1";
  const rawFiscalYear = searchParams.get("fiscalYear");
  const fiscalYear = rawFiscalYear === null ? null : Number(rawFiscalYear);
  if (!page || !pageSize) return { ok: false, status: 400, error: "invalid_pagination" };
  if (period && !["annual", "quarterly"].includes(period)) return { ok: false, status: 400, error: "invalid_period" };
  if (rawTicker && !/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) return { ok: false, status: 400, error: "invalid_ticker" };
  if (rawLatest && !["true", "false", "1", "0"].includes(rawLatest)) return { ok: false, status: 400, error: "invalid_latest" };
  if (rawFiscalYear !== null && (!/^\d{4}$/.test(rawFiscalYear) || !Number.isSafeInteger(fiscalYear) || fiscalYear < 1990 || fiscalYear > new Date().getUTCFullYear() + 1)) return { ok: false, status: 400, error: "invalid_fiscal_year" };
  if (latest && (!period || ticker)) return { ok: false, status: 400, error: "invalid_latest_query" };
  if (fiscalYear !== null && !period) return { ok: false, status: 400, error: "fiscal_year_requires_period" };
  return { ok: true, page, pageSize, offset: (page - 1) * pageSize, period, ticker, latest, fiscalYear };
}

function validDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function financialApiErrorResponse(reason = "financial-db-query-failed") {
  const body = { error: "financial_data_unavailable", reason, message: "Financial market data is temporarily unavailable." };
  const response = Response.json(body, { status: 503, headers: { "cache-control": FINANCIAL_API_CACHE_CONTROL } });
  return response;
}

export function financialApiResponse(payload, status = 200) {
  return Response.json(payload, { status, headers: { "cache-control": FINANCIAL_API_CACHE_CONTROL, "x-content-type-options": "nosniff" } });
}

export function financialRateLimitResponse(retryAfterSeconds) {
  return Response.json({ error: "rate_limit_exceeded", message: "Too many financial data requests." }, {
    status: 429,
    headers: { "cache-control": FINANCIAL_API_CACHE_CONTROL, "retry-after": String(Math.max(1, Math.min(60, Math.trunc(retryAfterSeconds) || 60))) },
  });
}

export function safeErrorCode(error) {
  return typeof error?.code === "string" && /^[a-z0-9-]{1,64}$/.test(error.code) ? error.code : "financial-data-unavailable";
}

export function parseFinancialHeatmapQuery(searchParams, type) {
  if (!["stock", "crypto"].includes(type)) return { ok: false, status: 400, error: "invalid_heatmap_type" };
  const market = searchParams.get("market");
  const referenceDate = searchParams.get("date");
  if (referenceDate && (!DATE_PATTERN.test(referenceDate) || !validDate(referenceDate))) return { ok: false, status: 400, error: "invalid_date" };
  if (type === "stock" && market && !["us", "kr"].includes(market)) return { ok: false, status: 400, error: "invalid_market_for_asset_type" };
  if (type === "crypto" && market && !["krw", "usd", "usdt"].includes(market)) return { ok: false, status: 400, error: "invalid_market_for_asset_type" };
  return { ok: true, market, referenceDate };
}
