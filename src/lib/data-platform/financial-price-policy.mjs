import { isFinancialRightsReviewCurrent } from "./financial-rights.mjs";

const REQUIREMENTS = Object.freeze({
  collect: ["apiAccess", "commercialUse", "dbStorage", "longTermRetention", "dailySnapshot"],
  publish: ["apiAccess", "commercialUse", "dbStorage", "longTermRetention", "publicDisplay", "userApi", "adSupportedDisplay"],
  visualize: ["apiAccess", "commercialUse", "dbStorage", "longTermRetention", "publicDisplay", "userApi", "adSupportedDisplay", "derivedVisualization"],
});

/** New price sources need dated evidence for each permission; this never approves existing sources. */
export function evaluatePriceOperation(source, operation, now = new Date()) {
  const required = REQUIREMENTS[operation];
  if (!required) throw new Error("Unknown financial price operation.");
  const rights = source?.financial_rights ?? {};
  const reasons = [];
  if (!Number.isFinite(Date.parse(source?.reviewed_at)) || Date.parse(source.reviewed_at) > now.getTime()) reasons.push("rights-review-date-invalid");
  if (source?.license_status !== "verified" || !isFinancialRightsReviewCurrent(source, now)) reasons.push("rights-review-not-current");
  if (operation === "collect" && source?.collection_enabled !== true) reasons.push("collection-disabled");
  if (!source?.attribution || !isHttps(source?.source_url)) reasons.push("source-attribution-missing");
  for (const right of required) {
    if (rights[right] !== "confirmed") reasons.push(`${right}-not-confirmed`);
    const evidence = rights.evidence?.[right];
    const reviewed = Date.parse(evidence?.reviewedAt);
    if (!isHttps(evidence?.url) || !Number.isFinite(reviewed) || reviewed > now.getTime()
      || typeof evidence?.scope !== "string" || !evidence.scope.trim()) reasons.push(`${right}-evidence-missing`);
  }
  return { allowed: reasons.length === 0, reasons, requiredRights: [...required] };
}

function isHttps(value) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}

/** NUMERIC(30,10), without converting a decimal string through binary floating point. */
export function priceDecimal(value, { positive = false, precision = 30 } = {}) {
  if (![20,30,38].includes(precision)) throw new Error("Unsupported database decimal precision.");
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Invalid price decimal.");
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Invalid price decimal.");
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) throw new Error("Invalid price decimal.");
  const [, sign, whole, fraction = "", exponentText = "0"] = match;
  const exponent = Number(exponentText);
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 40 || whole.length + fraction.length > 80) throw new Error("Price decimal exceeds precision.");
  let digits = whole + fraction;
  const at = whole.length + exponent;
  if (at <= 0) digits = "0." + "0".repeat(-at) + digits;
  else if (at >= digits.length) digits += "0".repeat(at - digits.length);
  else digits = digits.slice(0, at) + "." + digits.slice(at);
  let [integer, decimals = ""] = digits.split(".");
  integer = integer.replace(/^0+(?=\d)/, "");
  decimals = decimals.replace(/0+$/, "");
  if (integer.length > precision - 10 || decimals.length > 10) throw new Error("Price decimal exceeds database precision.");
  const nonzero = /[1-9]/.test(integer + decimals);
  if (positive && (!nonzero || sign === "-")) throw new Error("Price must be positive.");
  return `${nonzero ? sign : ""}${integer}${decimals ? "." + decimals : ""}`;
}

export function goldPricePerGram(price, unit) {
  const normalized = priceDecimal(price, { positive: true });
  if (unit === "gram") return normalized;
  if (unit !== "troy-ounce") throw new Error("Unknown gold weight unit.");
  const [whole, fraction = ""] = normalized.split(".");
  const scaled = BigInt(whole) * 10n ** 10n + BigInt(fraction.padEnd(10, "0"));
  const gram = scaled * 10_000_000n / 311_034_768n;
  return priceDecimal(`${gram / 10n ** 10n}.${(gram % (10n ** 10n)).toString().padStart(10, "0")}`, { positive: true });
}
