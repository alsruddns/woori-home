const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export function isValidMarketDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

// Keep monetary values as decimal strings across JSON and PostgreSQL boundaries.
export function validateMarketPriceRecord(record) {
  if (!record || typeof record !== "object") return { ok: false, reason: "invalid-record" };
  if (!record.assetId || !record.sourceId || !record.datasetId) return { ok: false, reason: "missing-identity" };
  if (!isValidMarketDate(record.referenceDate) || typeof record.referenceTimezone !== "string" || !record.referenceTimezone.trim()) return { ok: false, reason: "invalid-reference-date" };
  if (typeof record.priceKind !== "string" || !record.priceKind.trim()) return { ok: false, reason: "invalid-price-kind" };
  for (const field of ["open", "high", "low", "close", "volume", "marketCap"]) {
    const value = record[field];
    if (value === null || value === undefined) {
      if (field === "close") return { ok: false, reason: "missing-close" };
      continue;
    }
    if (typeof value !== "string" || !DECIMAL_RE.test(value)) return { ok: false, reason: `invalid-${field}` };
    const [integerPart, fraction = ""] = value.replace(/^-/, "").split(".");
    const totalDigits = integerPart.length + fraction.length;
    if (totalDigits > 30 || fraction.length > 10) return { ok: false, reason: `precision-${field}` };
    if (["volume", "marketCap"].includes(field) && value.startsWith("-")) return { ok: false, reason: `negative-${field}` };
  }
  if (!Number.isFinite(Date.parse(record.fetchedAt))) return { ok: false, reason: "invalid-fetched-at" };
  return { ok: true, record };
}

const SCALE = 10n ** 10n;
function scaled(value) {
  if (typeof value !== "string" || !DECIMAL_RE.test(value)) return null;
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  if (fraction.length > 10) return null;
  const amount = BigInt(whole) * SCALE + BigInt((fraction + "0".repeat(10)).slice(0, 10));
  return negative ? -amount : amount;
}

function decimalString(value, places = 10) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / SCALE;
  const fraction = (absolute % SCALE).toString().padStart(10, "0").slice(0, places).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function calculateMarketChange(current, previous) {
  const currentScaled = scaled(current);
  const previousScaled = scaled(previous);
  if (currentScaled === null || previousScaled === null || previousScaled <= 0n) return null;
  const amount = currentScaled - previousScaled;
  const percentScaled = (amount * 100n * SCALE) / previousScaled;
  return { change: decimalString(amount), changePercent: decimalString(percentScaled), direction: amount > 0n ? "up" : amount < 0n ? "down" : "flat" };
}

export function calculateGoldConversion({ usdPerTroyOunce, usdPerKrw, observedDate, fxReferenceDate, targetUnit }) {
  if (!isValidMarketDate(observedDate) || observedDate !== fxReferenceDate) return null;
  const price = scaled(usdPerTroyOunce);
  const fx = scaled(usdPerKrw);
  if (price === null || fx === null || price <= 0n || fx <= 0n || !["gram", "don"].includes(targetUnit)) return null;
  // 1 troy ounce = 31.1034768 g; retain precision until final presentation.
  const krwPerGram = (price * fx * 10n ** 7n) / (SCALE * 311034768n);
  return decimalString(targetUnit === "don" ? (krwPerGram * 375n) / 100n : krwPerGram, 10);
}
