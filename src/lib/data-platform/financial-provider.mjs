import { isValidMarketDate, validateMarketPriceRecord } from "./financial-market.mjs";

const ASSET_TYPES = new Set(["stock", "crypto", "metal", "energy", "agriculture", "fx", "rate", "index"]);
const MAX_REQUEST_DAYS = 3_660;

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, Math.trunc(parsed))) : fallback;
}

export class FinancialProviderError extends Error {
  constructor(code, message = "Financial provider collection failed.") {
    super(message);
    this.name = "FinancialProviderError";
    this.code = code;
  }
}

function validTimezone(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(0); return true; }
  catch { return false; }
}

function localDateAt(date, timezone) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isRetryable(error) {
  return error?.retryable === true || error?.status === 429 || Number(error?.status) >= 500 || error?.name === "AbortError";
}

function safeRetryDelay(error, attempt, baseDelayMs, maxDelayMs) {
  const retryAfterMs = Number(error?.retryAfterMs);
  if (Number.isFinite(retryAfterMs) && retryAfterMs >= 0) return Math.min(maxDelayMs, retryAfterMs);
  return Math.min(maxDelayMs, baseDelayMs * (2 ** attempt));
}

/**
 * Fetch and normalize one bounded provider snapshot. This function never writes to PostgreSQL.
 * A provider is eligible only after its exact data scope has been reviewed and marked verified.
 */
export async function collectFinancialProviderSnapshot(provider, request, options = {}) {
  if (!provider || typeof provider !== "object" || typeof provider.id !== "string" || typeof provider.datasetId !== "string" || typeof provider.fetchDailyPrices !== "function") {
    throw new FinancialProviderError("invalid-provider", "A provider adapter with an ID, dataset ID, and fetch method is required.");
  }
  if (provider.licenseStatus !== "verified" || !provider.attribution || !provider.sourceUrl) {
    throw new FinancialProviderError("provider-rights-unverified", "Collection is disabled until this provider scope has verified rights and attribution metadata.");
  }
  if (!request || !isValidMarketDate(request.startDate) || !isValidMarketDate(request.endDate) || request.startDate > request.endDate) {
    throw new FinancialProviderError("invalid-date-range", "The requested collection date range is invalid.");
  }
  const requestedDays = (Date.parse(`${request.endDate}T00:00:00Z`) - Date.parse(`${request.startDate}T00:00:00Z`)) / 86_400_000 + 1;
  if (requestedDays > MAX_REQUEST_DAYS) throw new FinancialProviderError("date-range-too-large", "A single provider collection request is limited to ten years of daily data.");
  const marketTimezone = request.marketTimezone ?? "UTC";
  if (!validTimezone(marketTimezone)) throw new FinancialProviderError("invalid-market-timezone", "A valid market timezone is required.");
  const currentDate = localDateAt(options.now ?? new Date(), marketTimezone);
  if (!isValidMarketDate(currentDate) || request.endDate > currentDate) {
    throw new FinancialProviderError("future-date", "Collection cannot request dates later than the market's current date.");
  }

  const maxAttempts = boundedInteger(options.maxAttempts, 3, 1, 5);
  const timeoutMs = boundedInteger(options.timeoutMs, 15_000, 100, 60_000);
  const baseDelayMs = boundedInteger(options.baseDelayMs, 250, 0, 10_000);
  const maxDelayMs = Math.max(baseDelayMs, boundedInteger(options.maxDelayMs, 5_000, 0, 30_000));
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let response;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    let timeout;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(Object.assign(new Error("Provider request timed out"), { name: "AbortError" }));
        }, timeoutMs);
      });
      response = await Promise.race([
        provider.fetchDailyPrices({ startDate: request.startDate, endDate: request.endDate, signal: controller.signal, limit: request.limit }),
        timeoutPromise,
      ]);
      break;
    } catch (error) {
      if (!isRetryable(error) || attempt === maxAttempts - 1) {
        const code = controller.signal.aborted ? "provider-timeout" : "provider-request-failed";
        throw new FinancialProviderError(code, "The financial provider request failed; credentials and response details were withheld.");
      }
      await sleep(safeRetryDelay(error, attempt, baseDelayMs, maxDelayMs));
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  if (!response || !Array.isArray(response.assets) || !Array.isArray(response.prices) || response.assets.length === 0) {
    throw new FinancialProviderError("invalid-provider-response", "The provider response does not match the financial snapshot contract.");
  }
  const maxRecords = boundedInteger(options.maxRecords, 10_000, 1, 20_000);
  if (response.assets.length > maxRecords || response.prices.length > maxRecords) {
    throw new FinancialProviderError("provider-response-too-large", "The provider response exceeds the configured record limit.");
  }

  const assets = new Map();
  for (const asset of response.assets) {
    if (!asset || typeof asset.sourceAssetId !== "string" || !asset.sourceAssetId.trim() || assets.has(asset.sourceAssetId)
      || !ASSET_TYPES.has(asset.assetType) || typeof asset.symbol !== "string" || !asset.symbol.trim()
      || typeof asset.name !== "string" || !asset.name.trim() || !/^[A-Z]{3}$/.test(asset.currency ?? "")
      || typeof asset.unit !== "string" || !asset.unit.trim() || !validTimezone(asset.timezone)) {
      throw new FinancialProviderError("invalid-asset-metadata", "Provider asset metadata failed validation.");
    }
    assets.set(asset.sourceAssetId, asset);
  }

  const seen = new Set();
  const prices = response.prices.map((price) => {
    const asset = assets.get(price?.sourceAssetId);
    if (!asset) throw new FinancialProviderError("unknown-provider-asset", "A price row refers to an asset missing from the provider response.");
    if (price.referenceDate < request.startDate || price.referenceDate > request.endDate) {
      throw new FinancialProviderError("price-outside-requested-range", "A provider price row is outside the requested date range.");
    }
    if (price.referenceTimezone !== asset.timezone) {
      throw new FinancialProviderError("price-timezone-mismatch", "A provider price row does not match its asset timezone.");
    }
    const key = `${price.sourceAssetId}\u0000${price.referenceDate}\u0000${price.priceKind}`;
    if (seen.has(key)) throw new FinancialProviderError("duplicate-provider-price", "The provider returned duplicate asset/date/price-kind rows.");
    seen.add(key);
    const record = { ...price, assetId: price.sourceAssetId, sourceId: provider.id, datasetId: provider.datasetId };
    const validation = validateMarketPriceRecord(record);
    if (!validation.ok) throw new FinancialProviderError(`invalid-price-${validation.reason}`, "A provider price row failed numeric or timestamp validation.");
    if (price.sourceUpdatedAt != null && !Number.isFinite(Date.parse(price.sourceUpdatedAt))) {
      throw new FinancialProviderError("invalid-source-updated-at", "The provider revision timestamp is invalid.");
    }
    return price;
  });
  if (prices.length === 0) throw new FinancialProviderError("empty-provider-snapshot", "An empty provider response is not importable.");

  return {
    schemaVersion: 1,
    sourceId: provider.id,
    datasetId: provider.datasetId,
    snapshotVersion: typeof response.snapshotVersion === "string" ? response.snapshotVersion : null,
    assets: response.assets,
    prices,
  };
}
