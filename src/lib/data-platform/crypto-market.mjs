const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export function validateCryptoSnapshot(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== 1 || !["approved", "pending", "unverified"].includes(snapshot.licenseStatus) || !Array.isArray(snapshot.snapshots)) return false;
  const dates = new Set();
  for (const day of snapshot.snapshots) {
    if (!validDate(day.referenceDate) || typeof day.asOf !== "string" || !Number.isFinite(Date.parse(day.asOf)) || new Date(day.asOf).toISOString().slice(0, 10) !== day.referenceDate || !Array.isArray(day.coins) || dates.has(day.referenceDate)) return false;
    dates.add(day.referenceDate);
    const ids = new Set();
    for (const coin of day.coins) {
      if (!coin || typeof coin.id !== "string" || !coin.id || ids.has(coin.id)) return false;
      if (typeof coin.symbol !== "string" || !coin.symbol || typeof coin.name !== "string" || !coin.name || typeof coin.currency !== "string" || !/^[A-Z]{3,8}$/.test(coin.currency)) return false;
      if (!Number.isFinite(coin.close) || coin.close <= 0) return false;
      for (const field of ["marketCap", "volume"]) {
        if (coin[field] !== null && coin[field] !== undefined && (!Number.isFinite(coin[field]) || coin[field] < 0)) return false;
      }
      if (coin.previousUtcClose !== null && coin.previousUtcClose !== undefined && (!Number.isFinite(coin.previousUtcClose) || coin.previousUtcClose <= 0)) return false;
      if (coin.change24hPercent !== null && coin.change24hPercent !== undefined && !Number.isFinite(coin.change24hPercent)) return false;
      ids.add(coin.id);
    }
  }
  return true;
}

export function isPublishableCryptoSnapshot(snapshot) {
  return validateCryptoSnapshot(snapshot) && snapshot.licenseStatus === "approved" && Boolean(snapshot.providerName && snapshot.sourceId);
}

export function cryptoDates(snapshot) {
  return [...new Set(snapshot.snapshots.map((item) => item.referenceDate))].sort();
}

export function adjacentCryptoDates(dates, selectedDate) {
  const ordered = [...dates].sort();
  return { previous: ordered.filter((date) => date < selectedDate).at(-1), next: ordered.find((date) => date > selectedDate) };
}

export function dailyCloseChange(current, previous) {
  if (!current) return null;
  const previousClose = previous
    ? previous.id === current.id && previous.currency === current.currency ? previous.close : null
    : current.previousUtcClose;
  if (!Number.isFinite(previousClose) || previousClose <= 0) return null;
  const amount = current.close - previousClose;
  return { amount, percent: amount / previousClose * 100 };
}

export function cryptoHeatmapWeights(coins) {
  if (!coins.length || coins.some((coin) => !Number.isFinite(coin.marketCap) || coin.marketCap <= 0)) return null;
  const total = coins.reduce((sum, coin) => sum + coin.marketCap, 0);
  if (!(total > 0)) return null;
  return Object.fromEntries(coins.map((coin) => [coin.id, coin.marketCap / total]));
}

export function cryptoTreemapLayout(coins, bounds = { width: 100, height: 100 }) {
  const weights = cryptoHeatmapWeights(coins);
  if (!weights) return null;
  const width = Number.isFinite(bounds.width) && bounds.width > 0 ? bounds.width : 100;
  const height = Number.isFinite(bounds.height) && bounds.height > 0 ? bounds.height : 100;
  const output = {};
  const split = (items, rect) => {
    if (items.length === 1) {
      output[items[0].id] = rect;
      return;
    }
    const total = items.reduce((sum, item) => sum + weights[item.id], 0);
    let running = 0;
    let splitIndex = 1;
    let bestDifference = Infinity;
    for (let index = 1; index < items.length; index += 1) {
      running += weights[items[index - 1].id];
      const difference = Math.abs(total / 2 - running);
      if (difference < bestDifference) { bestDifference = difference; splitIndex = index; }
    }
    const left = items.slice(0, splitIndex);
    const right = items.slice(splitIndex);
    const leftWeight = left.reduce((sum, item) => sum + weights[item.id], 0);
    if (rect.width >= rect.height) {
      const width = rect.width * leftWeight / total;
      split(left, { ...rect, width });
      split(right, { x: rect.x + width, y: rect.y, width: rect.width - width, height: rect.height });
    } else {
      const height = rect.height * leftWeight / total;
      split(left, { ...rect, height });
      split(right, { x: rect.x, y: rect.y + height, width: rect.width, height: rect.height - height });
    }
  };
  split(coins, { x: 0, y: 0, width, height });
  return output;
}

export function deduplicateMarketIssues(issues) {
  const seen = new Set();
  return issues.filter((issue) => {
    try { if (new URL(issue.url).protocol !== "https:") return false; } catch { return false; }
    const key = issue.externalId ? `${issue.sourceId}:${issue.externalId}` : `${issue.sourceId}:${issue.url}`;
    if (!issue.sourceId || !issue.url || !issue.originalTitle || !issue.publishedAt || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function validUtcDate(value) {
  return validDate(value);
}
