export const FINANCIAL_RIGHTS = Object.freeze(["apiAccess", "publicDisplay", "dbStorage", "longTermRetention", "userApi", "csvRedistribution", "derivedVisualization", "dailySnapshot", "adSupportedDisplay", "competitorPermission"]);
export const FINANCIAL_RIGHTS_STATUSES = Object.freeze(["confirmed", "pending", "restricted", "denied"]);

export function isFinancialRightsReviewCurrent(source, now = new Date()) {
  if (!source || !source.terms_version && !source.termsVersion || !source.reviewed_at && !source.reviewedAt) return false;
  const due = Date.parse(source.review_due_at ?? source.reviewDueAt);
  return Number.isFinite(due) && due > now.getTime();
}

export function hasFinancialRight(source, right, now = new Date()) {
  if (!FINANCIAL_RIGHTS.includes(right) || !isFinancialRightsReviewCurrent(source, now)) return false;
  return source.financial_rights?.[right] === "confirmed" || source.financialRights?.[right] === "confirmed";
}

export function canCollectFinancialPrices(source, now = new Date()) {
  return Boolean(source?.collection_enabled ?? source?.collectionEnabled)
    && ["apiAccess", "dbStorage", "longTermRetention"].every((right) => hasFinancialRight(source, right, now))
    && Boolean(source.attribution && (source.source_url ?? source.sourceUrl));
}

/** Crypto daily candles need an explicit scope review in addition to generic API/storage rights. */
export function canCollectCryptoDailySnapshots(source, now = new Date()) {
  const rights = source?.financial_rights ?? source?.financialRights ?? {};
  return Boolean(source?.collection_enabled ?? source?.collectionEnabled)
    && rights.dailySnapshot === "confirmed"
    && ["apiAccess", "dbStorage", "longTermRetention"].every((right) => hasFinancialRight(source, right, now))
    && Boolean(source.attribution && (source.source_url ?? source.sourceUrl));
}

/** Coinranking snapshots require explicit written scope for a competing crypto service as well as storage. */
export function canCollectCoinrankingDailySnapshots(source, now = new Date()) {
  const rights = source?.financial_rights ?? source?.financialRights ?? {};
  return (source?.id ?? source?.providerId) === "coinranking-aggregate"
    && (source?.license_status ?? source?.licenseStatus) === "verified"
    && Boolean(source?.collection_enabled ?? source?.collectionEnabled)
    && rights.dailySnapshot === "confirmed"
    && rights.competitorPermission === "confirmed"
    && ["apiAccess", "dbStorage", "longTermRetention"].every((right) => hasFinancialRight(source, right, now))
    && Boolean(source.attribution && (source.source_url ?? source.sourceUrl));
}

/** Public crypto snapshots are hidden unless the exact daily, ad-supported, visitor API scope is current. */
export function canPublishCryptoDailySnapshots(source, now = new Date()) {
  const rights = source?.financial_rights ?? source?.financialRights ?? {};
  return ["apiAccess", "publicDisplay", "userApi", "dbStorage", "longTermRetention", "derivedVisualization"]
    .every((right) => hasFinancialRight(source, right, now))
    && rights.dailySnapshot === "confirmed"
    && rights.adSupportedDisplay === "confirmed"
    && ((source?.id ?? source?.providerId) !== "coinranking-aggregate" || ((source?.license_status ?? source?.licenseStatus) === "verified" && rights.competitorPermission === "confirmed"))
    && Boolean(source.attribution && (source.source_url ?? source.sourceUrl));
}

export function canPublishFinancialMarketData(source, now = new Date()) {
  return ["apiAccess", "publicDisplay", "userApi"].every((right) => hasFinancialRight(source, right, now));
}

export function canCreateFinancialVisualization(source, now = new Date()) {
  return canPublishFinancialMarketData(source, now) && hasFinancialRight(source, "derivedVisualization", now);
}

export function financialRightsSummary(rights = {}) {
  return Object.fromEntries(FINANCIAL_RIGHTS.map((right) => [right, FINANCIAL_RIGHTS_STATUSES.includes(rights[right]) ? rights[right] : "pending"]));
}
