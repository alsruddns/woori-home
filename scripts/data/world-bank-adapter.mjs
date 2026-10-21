const API = "https://api.worldbank.org/v2";
const LICENSE = "World Bank terms of use; indicator-specific terms may apply";
const INDICATOR_LICENSES = {
  "SL.UEM.TOTL.ZS": "World Bank terms (CC BY 4.0 default); ILOSTAT data CC BY 4.0",
  "EG.ELC.ACCS.ZS": "CC BY 4.0; World Bank WDI, SDG 7.1.1 Electrification Dataset (ESMAP/World Bank)",
};
const UNITS = {
  "SP.POP.TOTL": "people", "NY.GDP.MKTP.CD": "current US dollars", "NY.GDP.PCAP.CD": "current US dollars per person",
  "SP.DYN.TFRT.IN": "births per woman", "SP.DYN.LE00.IN": "years", "SP.POP.GROW": "percent per year",
  "SL.UEM.TOTL.ZS": "percent of labor force",
  "EG.ELC.ACCS.ZS": "percent of population",
};

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function requestJson(url, fetchImpl, waitImpl) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetchImpl(url, { headers: { "User-Agent": "WOORI.TODAY-data-pipeline/1.0" }, signal: AbortSignal.timeout(60000) });
      if (response.ok) return response.json();
      if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === 3) throw new Error(`World Bank returned HTTP ${response.status}`);
      const retryAfter = Number(response.headers?.get?.("retry-after"));
      await waitImpl(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 20000) : 1000 * (attempt + 1));
    } catch (error) {
      if (error.message?.includes("HTTP") || attempt === 3) throw error;
      await waitImpl(1000 * (attempt + 1));
    }
  }
  throw new Error("World Bank request retries exhausted");
}

export async function fetchWorldBankIndicator({ indicator, countries, startYear = 1990, endYear = new Date().getUTCFullYear(), checkedAt = new Date().toISOString(), fetchImpl = fetch, waitImpl = delay }) {
  const url = `${API}/country/${countries.join(";")}/indicator/${indicator}?format=json&per_page=20000&date=${startYear}:${endYear}`;
  let payload;
  try {
    payload = await requestJson(url, fetchImpl, waitImpl);
  } catch (error) {
    throw new Error(`${indicator}: ${error.message}`);
  }
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) throw new Error(`${indicator}: unexpected World Bank response structure`);
  const [metadata, rows] = payload;
  if (rows.length === 0) throw new Error(`${indicator}: World Bank returned no observations`);
  let indicatorPayload;
  try {
    indicatorPayload = await requestJson(`${API}/indicator/${indicator}?format=json`, fetchImpl, waitImpl);
  } catch (error) {
    throw new Error(`${indicator}: World Bank metadata ${error.message}`);
  }
  const provider = indicatorPayload?.[1]?.[0]?.sourceOrganization;
  if (typeof provider !== "string" || provider.trim().length === 0) throw new Error(`${indicator}: provider attribution metadata is missing`);
  const observations = rows.filter((row) => row.countryiso3code && /^\d{4}$/.test(row.date) && Number.isFinite(row.value)).map((row) => ({
    country: row.countryiso3code,
    countryName: row.country?.value ?? row.countryiso3code,
    indicator,
    year: Number(row.date),
    value: row.value,
    unit: row.unit || UNITS[indicator] || "",
    source: "World Bank",
    dataProvider: provider.replace(/\s+/g, " ").trim(),
    sourceUrl: url,
    license: INDICATOR_LICENSES[indicator] || LICENSE,
    publishedAt: null,
    lastCheckedAt: checkedAt,
    lastUpdatedAt: metadata?.lastupdated ?? checkedAt,
  }));
  return { observations, publishedAt: metadata?.lastupdated ?? null, sourceUrl: url };
}
