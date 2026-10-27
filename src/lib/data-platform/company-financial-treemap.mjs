export function sicDivision(sicCode) {
  if (!/^\d{4}$/.test(String(sicCode ?? ""))) return { key: "unclassified", label: "unclassified" };
  const code = Number(sicCode);
  if (code >= 100 && code <= 999) return { key: "agriculture", label: "Agriculture, forestry and fishing" };
  if (code >= 1000 && code <= 1499) return { key: "mining", label: "Mining" };
  if (code >= 1500 && code <= 1799) return { key: "construction", label: "Construction" };
  if (code >= 2000 && code <= 3999) return { key: "manufacturing", label: "Manufacturing" };
  if (code >= 4000 && code <= 4999) return { key: "transport-utilities", label: "Transportation, communications and utilities" };
  if (code >= 5000 && code <= 5999) return { key: "trade", label: code < 5200 ? "Wholesale trade" : "Retail trade" };
  if (code >= 6000 && code <= 6799) return { key: "finance-real-estate", label: "Finance, insurance and real estate" };
  if (code >= 7000 && code <= 8999) return { key: "services", label: "Services" };
  if (code >= 9100 && code <= 9729) return { key: "public-administration", label: "Public administration" };
  if (code >= 9900 && code <= 9999) return { key: "unclassified", label: "Nonclassifiable" };
  return { key: "unclassified", label: "unclassified" };
}

/**
 * Maps each registrant once to a display theme using its SEC SIC code.
 * More specific, SEC-described activities take precedence over broad sectors.
 */
export function sicIndustryGroup(sicCode) {
  if (!/^\d{4}$/.test(String(sicCode ?? ""))) return "unclassified";
  const code = Number(sicCode);
  if (code === 0 || code >= 9730) return "unclassified";
  if ((code >= 3570 && code <= 3579) || (code >= 7370 && code <= 7379)) return "technology";
  if (code === 3674) return "semiconductors";
  if ((code >= 2830 && code <= 2836) || (code >= 3840 && code <= 3851) || code === 6324 || (code >= 8000 && code <= 8099)) return "healthcare";
  if ((code >= 1200 && code <= 1399) || code === 2911 || code === 2990 || (code >= 4911 && code <= 4939) || code === 5171 || code === 5172) return "energy";
  if ((code >= 2000 && code <= 2399) || (code >= 2500 && code <= 2599) || (code >= 2840 && code <= 2844) || (code >= 3100 && code <= 3199) || (code >= 5200 && code <= 5999)) return "consumer";
  if ((code >= 4800 && code <= 4899) || (code >= 7812 && code <= 7841)) return "telecom-media";
  if ((code >= 1500 && code <= 1799) || (code >= 2000 && code <= 3999) || (code >= 4000 && code <= 4799)) return "industrial";
  if (code >= 6000 && code <= 6799) return "finance";
  return "other";
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
