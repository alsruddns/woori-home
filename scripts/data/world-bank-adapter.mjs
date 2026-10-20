const API = "https://api.worldbank.org/v2";
const LICENSE = "CC BY 4.0 where applicable; verify dataset-specific terms";
const UNITS = { "SP.POP.TOTL": "people", "NY.GDP.MKTP.CD": "current US dollars", "NY.GDP.PCAP.CD": "current US dollars per person", "SP.DYN.TFRT.IN": "births per woman", "SP.DYN.LE00.IN": "years", "SP.POP.GROW": "percent per year" };

export async function fetchWorldBankIndicator({ indicator, countries, startYear = 1990, endYear = new Date().getUTCFullYear(), checkedAt = new Date().toISOString() }) {
  const url = `${API}/country/${countries.join(";")}/indicator/${indicator}?format=json&per_page=20000&date=${startYear}:${endYear}`;
  const response = await fetch(url, { headers: { "User-Agent": "WOORI.TODAY-data-pipeline/1.0" }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${indicator}: World Bank returned HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) throw new Error(`${indicator}: unexpected World Bank response structure`);
  const [metadata, rows] = payload;
  if (rows.length === 0) throw new Error(`${indicator}: World Bank returned no observations`);
  const observations = rows.filter((row) => row.countryiso3code && /^\d{4}$/.test(row.date) && Number.isFinite(row.value)).map((row) => ({
    country: row.countryiso3code,
    countryName: row.country?.value ?? row.countryiso3code,
    indicator,
    year: Number(row.date),
    value: row.value,
    unit: row.unit || UNITS[indicator] || "",
    source: "World Bank",
    sourceUrl: url,
    license: LICENSE,
    publishedAt: null,
    lastCheckedAt: checkedAt,
    lastUpdatedAt: metadata?.lastupdated ?? checkedAt,
  }));
  return { observations, publishedAt: metadata?.lastupdated ?? null, sourceUrl: url };
}
