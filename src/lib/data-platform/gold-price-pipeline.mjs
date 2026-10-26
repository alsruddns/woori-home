import { isValidMarketDate } from "./financial-market.mjs";
import { priceDecimal } from "./financial-price-policy.mjs";

export const GOLD_SOURCE_ID = "goldapi-spot";
export const GOLD_DATASET_ID = "goldapi-usd-spot-observations";

export function normalizeGoldObservation(raw, { now = new Date() } = {}) {
  if (!raw || raw.metal !== "XAU" || raw.currency !== "USD" || raw.unit !== "troy_ounce") throw new Error("Gold provider currency, metal or unit mismatch.");
  const timestamp = Number(raw.timestamp);
  if (!Number.isInteger(timestamp) || timestamp <= 0) throw new Error("Gold provider observation time is missing.");
  const observed = new Date(timestamp * 1000);
  const age = now.getTime() - observed.getTime();
  if (!Number.isFinite(age) || age < -60_000 || age > 7 * 86_400_000) throw new Error("Gold provider observation is future-dated or stale.");
  const referenceDate = observed.toISOString().slice(0, 10);
  if (!isValidMarketDate(referenceDate)) throw new Error("Gold reference date is invalid.");
  const price = priceDecimal(raw.price, { positive: true });
  if (typeof raw.exchange !== "string" || !/^[A-Za-z0-9_.:-]{1,80}$/.test(raw.exchange)) throw new Error("Gold provider venue is missing.");
  return {
    schemaVersion: 1, sourceId: GOLD_SOURCE_ID, datasetId: GOLD_DATASET_ID,
    assets: [{ sourceAssetId: `XAU:USD:troy-ounce:${raw.exchange}`, assetType: "metal", symbol: "XAU", name: "Gold",
      venue: raw.exchange, currency: "USD", unit: "troy-ounce", timezone: "UTC", isActive: true,
      metadata: { priceType: "spot-reference", baseCurrency: "XAU", quoteCurrency: "USD", qualityStatus: "validated", sourceUrl: "https://www.goldapi.io/" } }],
    prices: [{ sourceAssetId: `XAU:USD:troy-ounce:${raw.exchange}`, referenceDate, referenceTimezone: "UTC",
      priceKind: "spot-reference", close: price, fetchedAt: now.toISOString(), sourceUpdatedAt: observed.toISOString(), isAdjusted: false }],
  };
}

/** Server-only credential use. Errors never include the request headers, token, or upstream body. */
export function createGoldApiProvider({ apiKey = process.env.GOLDAPI_API_KEY, fetchImpl = fetch, now = () => new Date() } = {}) {
  return {
    id: GOLD_SOURCE_ID, datasetId: GOLD_DATASET_ID,
    async fetchObservation({ signal } = {}) {
      if (!apiKey) throw Object.assign(new Error("GoldAPI credential is not configured."), { code: "provider-not-configured" });
      let response;
      try {
        response = await fetchImpl("https://www.goldapi.io/api/price/XAU/USD", {
          headers: { "x-access-token": apiKey, accept: "application/json" },
          signal: signal ?? AbortSignal.timeout(15_000), cache: "no-store", redirect: "error",
        });
      } catch { throw Object.assign(new Error("GoldAPI network request failed; upstream details withheld."), { code: "provider-network-failed" }); }
      if (!response.ok) throw Object.assign(new Error("GoldAPI request failed; upstream details withheld."), { status: response.status, code: `provider-http-${response.status}` });
      let raw;
      try { raw = await response.json(); } catch { throw new Error("GoldAPI returned invalid JSON."); }
      return normalizeGoldObservation(raw, { now: now() });
    },
  };
}
