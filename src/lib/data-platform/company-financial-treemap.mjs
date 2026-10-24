export function sicDivision(sicCode) {
  if (!/^\d{4}$/.test(String(sicCode ?? ""))) return { key: "unclassified", label: "unclassified" };
  const code = Number(sicCode);
  if (code >= 100 && code <= 1499) return { key: "mining", label: "Mining" };
  if (code >= 1500 && code <= 1799) return { key: "construction", label: "Construction" };
  if (code >= 2000 && code <= 3999) return { key: "manufacturing", label: "Manufacturing" };
  if (code >= 4000 && code <= 4999) return { key: "transport-utilities", label: "Transportation, communications and utilities" };
  if (code >= 5000 && code <= 5999) return { key: "trade", label: "Wholesale and retail trade" };
  if (code >= 6000 && code <= 6799) return { key: "finance-real-estate", label: "Finance, insurance and real estate" };
  if (code >= 7000 && code <= 8999) return { key: "services", label: "Services" };
  if (code >= 9100 && code <= 9999) return { key: "public-administration", label: "Public administration" };
  if (code >= 100 && code <= 999) return { key: "agriculture", label: "Agriculture, forestry and fishing" };
  return { key: "unclassified", label: "unclassified" };
}

export function companyFinancialMetrics(row, prior = null) {
  const revenue = finite(row?.revenue);
  const operatingIncome = finite(row?.operatingIncome);
  const netIncome = finite(row?.netIncome);
  const assets = finite(row?.assets);
  const previousRevenue = finite(prior?.revenue);
  const revenueGrowth = revenue !== null && previousRevenue !== null && previousRevenue > 0
    ? (revenue / previousRevenue - 1) * 100 : null;
  return {
    revenue,
    operatingIncome,
    netIncome,
    assets,
    revenueGrowth: Number.isFinite(revenueGrowth) ? revenueGrowth : null,
    operatingMargin: revenue !== null && revenue !== 0 && operatingIncome !== null ? operatingIncome / revenue * 100 : null,
    netMargin: revenue !== null && revenue !== 0 && netIncome !== null ? netIncome / revenue * 100 : null,
  };
}

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
