export type GoldPriceKind = "market-reference" | "customer-buy" | "customer-sell";
export type GoldPriceUnit = "gram";

export type GoldQuote = {
  providerId: string;
  providerName: string;
  priceKind: GoldPriceKind;
  currency: string;
  unit: GoldPriceUnit;
  price: number;
  licenseReference: string;
  rightsVerified: true;
  observedAt: string;
  observedTime?: string;
  stale?: boolean;
  previousTradingDate: string | null;
  fetchedAt: string;
  sourceUrl: string;
  conditions: string;
};

export type GoldSnapshot = {
  schemaVersion: 1;
  status: "disabled" | "success" | "unchanged" | "failed";
  reason: string;
  quotes: GoldQuote[];
};

export type GoldMove = {
  change: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
} | null;

const TROY_OUNCE_IN_GRAMS = 31.1034768;

export function normalizeLicensedGoldQuote(input: {
  providerId: string; providerName: string; priceKind: GoldPriceKind; currency: string;
  sourceUnit: "gram" | "troy-ounce"; sourcePrice: number; observedAt: string;
  previousTradingDate: string | null; fetchedAt: string; sourceUrl: string;
  conditions: string; rightsVerified: boolean; licenseReference: string;
}): GoldQuote | null {
  if (!input.rightsVerified || !input.licenseReference.trim()) return null;
  if (!Number.isFinite(input.sourcePrice) || input.sourcePrice <= 0 || !/^[A-Z]{3}$/.test(input.currency)) return null;
  const price = input.sourceUnit === "troy-ounce" ? input.sourcePrice / TROY_OUNCE_IN_GRAMS : input.sourcePrice;
  if (!Number.isFinite(price) || price <= 0) return null;
  const quote: GoldQuote = {
    providerId: input.providerId,
    providerName: input.providerName,
    priceKind: input.priceKind,
    currency: input.currency,
    unit: "gram",
    price,
    licenseReference: input.licenseReference,
    rightsVerified: true,
    observedAt: input.observedAt,
    previousTradingDate: input.previousTradingDate,
    fetchedAt: input.fetchedAt,
    sourceUrl: input.sourceUrl,
    conditions: input.conditions,
  };
  return validateGoldSnapshot({ schemaVersion: 1, status: "success", reason: "", quotes: [quote] }) ? quote : null;
}

export function calculateGoldMove(current: number, previous: number | null | undefined): GoldMove {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === null || previous === undefined || previous <= 0) return null;
  const change = current - previous;
  return { change, changePercent: (change / previous) * 100, direction: change > 0 ? "up" : change < 0 ? "down" : "flat" };
}

export function pricePerGoldUnit(pricePerGram: number, unit: "gram" | "don") {
  if (!Number.isFinite(pricePerGram)) return null;
  return unit === "don" ? pricePerGram * 3.75 : pricePerGram;
}

export function findPreviousComparableQuote(quotes: GoldQuote[], quote: GoldQuote) {
  return quotes
    .filter((candidate) => candidate.providerId === quote.providerId
      && candidate.priceKind === quote.priceKind
      && candidate.currency === quote.currency
      && candidate.unit === quote.unit
      && quote.previousTradingDate !== null
      && candidate.observedAt === quote.previousTradingDate
      && Number.isFinite(candidate.price)
      && candidate.price > 0)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0] ?? null;
}

export function validateGoldSnapshot(snapshot: GoldSnapshot) {
  if (snapshot.schemaVersion !== 1 || !["disabled", "success", "unchanged", "failed"].includes(snapshot.status) || typeof snapshot.reason !== "string" || !Array.isArray(snapshot.quotes)) return false;
  const unique = new Set<string>();
  for (const quote of snapshot.quotes) {
    if (!quote.providerId || !quote.providerName || !quote.currency || quote.unit !== "gram" || quote.rightsVerified !== true || !quote.licenseReference) return false;
    if (!("market-reference" === quote.priceKind || "customer-buy" === quote.priceKind || "customer-sell" === quote.priceKind)) return false;
    if (!Number.isFinite(quote.price) || quote.price <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(quote.observedAt)) return false;
    if (quote.previousTradingDate !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(quote.previousTradingDate) || quote.previousTradingDate >= quote.observedAt)) return false;
    if (!Number.isFinite(Date.parse(quote.fetchedAt)) || !quote.sourceUrl.startsWith("https://")) return false;
    const key = [quote.providerId, quote.priceKind, quote.currency, quote.unit, quote.observedAt].join("|");
    if (unique.has(key)) return false;
    unique.add(key);
  }
  return true;
}
