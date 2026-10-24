export const IMPORTABLE_INDICATORS = Object.freeze({
  "SP.POP.TOTL": {
    unit: "people", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    provider: "World Bank World Development Indicators; source providers include UN Population Division and national statistical offices",
    providerUrl: "https://databank.worldbank.org/metadataglossary/world-development-indicators/series/SP.POP.TOTL",
    rightsNote: "World Bank WDI indicator metadata explicitly lists CC BY-4.0. Attribute The World Bank, World Development Indicators, and the data source named in metadata. Third-party exceptions in the World Bank Dataset Terms remain applicable.",
  },
  "NY.GDP.MKTP.CD": {
    unit: "current US dollars", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    provider: "World Bank World Development Indicators; country national accounts, OECD, and World Bank staff estimates",
    providerUrl: "https://databank.worldbank.org/metadataglossary/world-development-indicators/series/NY.GDP.MKTP.CD",
    rightsNote: "World Bank WDI indicator metadata explicitly lists CC BY-4.0. Attribute The World Bank, World Development Indicators, and the data source named in metadata. Third-party exceptions in the World Bank Dataset Terms remain applicable.",
  },
  "NY.GDP.PCAP.KD": {
    unit: "constant 2015 US dollars per person", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    provider: "World Bank national accounts data and OECD National Accounts data files",
    providerUrl: "https://databank.worldbank.org/metadataglossary/world-development-indicators/series/NY.GDP.PCAP.KD",
    rightsNote: "World Bank WDI indicator metadata explicitly lists CC BY-4.0. Constant 2015 US dollars. Attribute The World Bank, World Development Indicators, and the data source named in metadata. Third-party exceptions remain applicable.",
  },
  "NY.GDP.MKTP.KD.ZG": {
    unit: "percent per year", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    provider: "World Bank World Development Indicators; country national accounts, OECD, and World Bank staff estimates",
    providerUrl: "https://databank.worldbank.org/metadataglossary/world-development-indicators/series/NY.GDP.MKTP.KD.ZG",
    rightsNote: "World Bank WDI indicator metadata explicitly lists CC BY-4.0. Real annual GDP growth at constant prices. Attribute The World Bank, World Development Indicators, and the data source named in metadata. Third-party exceptions remain applicable.",
  },
  "FP.CPI.TOTL.ZG": {
    unit: "percent per year", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    provider: "International Monetary Fund, International Financial Statistics database (as catalogued by World Bank WDI)",
    providerUrl: "https://databank.worldbank.org/metadataglossary/world-development-indicators/series/FP.CPI.TOTL.ZG",
    rightsNote: "World Bank WDI indicator metadata explicitly lists CC BY-4.0 for this series. The indicator source is IMF IFS; attribute The World Bank, World Development Indicators, and IMF IFS. Recheck metadata terms before changing provider or source dataset.",
  },
  "SL.UEM.TOTL.ZS": {
    unit: "percent of labor force",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    provider: "ILO Modelled Estimates database (ILOEST), International Labour Organization (ILO)",
    providerUrl: "https://ilostat.ilo.org/data/",
    rightsNote: "ILOSTAT datasets and reference metadata published on or after 2023-05-03 are CC BY 4.0 unless otherwise indicated. The indicator is a modeled estimate.",
  },
  "EG.ELC.ACCS.ZS": {
    unit: "percent of population",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    provider: "World Bank / Sustainable Energy for All (SE4ALL), Global Tracking Framework (World Bank, IEA, ESMAP)",
    providerUrl: "https://databank.worldbank.org/metadataglossary/jobs/series/EG.ELC.ACCS.ZS",
    rightsNote: "World Bank DataBank metadata labels this indicator CC BY-4.0. It measures access to electricity, not consumption.",
  },
});

export const LOCALES = Object.freeze(["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"]);

export function parseImportArgs(args) {
  const options = { dataset: "world-development-indicators", dryRun: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") { options.dryRun = true; continue; }
    const match = arg.match(/^--(dataset|indicator|country|year-from|year-to)=(.+)$/);
    if (match) {
      const key = ({ "year-from": "yearFrom", "year-to": "yearTo" })[match[1]] ?? match[1];
      options[key] = match[2];
      continue;
    }
    if (["--dataset", "--indicator", "--country", "--year-from", "--year-to"].includes(arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      const key = ({ "--year-from": "yearFrom", "--year-to": "yearTo", "--dataset": "dataset", "--indicator": "indicator", "--country": "country" })[arg];
      options[key] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  if (options.dataset !== "world-development-indicators") throw new Error("Only the world-development-indicators dataset is supported");
  if (options.indicator && !IMPORTABLE_INDICATORS[options.indicator]) throw new Error(`Indicator ${options.indicator} is not approved for database storage`);
  if (options.country && !/^[A-Z]{3}$/i.test(options.country)) throw new Error(`Unsupported ISO3 or aggregate country code: ${options.country}`);
  for (const key of ["yearFrom", "yearTo"]) {
    if (options[key] !== undefined && (!/^\d{4}$/.test(String(options[key])) || Number(options[key]) < 1800 || Number(options[key]) > 2200)) {
      throw new Error(`${key} must be a year between 1800 and 2200`);
    }
    if (options[key] !== undefined) options[key] = Number(options[key]);
  }
  if (options.yearFrom !== undefined && options.yearTo !== undefined && options.yearFrom > options.yearTo) throw new Error("year-from must be less than or equal to year-to");
  if (options.country) options.country = options.country.toUpperCase();
  return options;
}

export function decimalString(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Observation values must be finite JSON numbers");
  const raw = String(value);
  const sign = raw.startsWith("-") ? "-" : "";
  const unsigned = raw.replace(/^-/, "");
  const [mantissa, exponentText] = unsigned.toLowerCase().split("e");
  const exponent = Number(exponentText ?? 0);
  const [whole, fraction = ""] = mantissa.split(".");
  const digits = whole + fraction;
  const decimalIndex = whole.length + exponent;
  const expanded = decimalIndex <= 0
    ? `0.${"0".repeat(-decimalIndex)}${digits}`
    : decimalIndex >= digits.length
      ? `${digits}${"0".repeat(decimalIndex - digits.length)}`
      : `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
  const normalized = expanded.includes(".") ? expanded.replace(/0+$/, "").replace(/\.$/, "") : expanded;
  const [integerPart, fractionPart = ""] = normalized.replace(/^-/, "").split(".");
  if (integerPart.replace(/^0+/, "").length > 20) throw new Error(`Value ${raw} exceeds NUMERIC(30,10)`);
  const keptFraction = fractionPart.slice(0, 10).padEnd(10, "0");
  const shouldRoundUp = fractionPart.length > 10 && fractionPart[10] >= "5";
  let scaled = BigInt(integerPart || "0") * 10_000_000_000n + BigInt(keptFraction || "0");
  if (shouldRoundUp) scaled += 1n;
  if (scaled === 0n) return "0";
  const roundedInteger = scaled / 10_000_000_000n;
  const roundedFraction = String(scaled % 10_000_000_000n).padStart(10, "0").replace(/0+$/, "");
  if (roundedInteger.toString().length > 20) throw new Error(`Value ${raw} exceeds NUMERIC(30,10)`);
  const rounded = roundedFraction ? `${roundedInteger}.${roundedFraction}` : roundedInteger.toString();
  return `${sign}${rounded}`;
}

export function normalizeWorldBankSnapshot(snapshot, options = {}) {
  if (snapshot?.schemaVersion !== 2 || snapshot?.source !== "World Bank" || !Array.isArray(snapshot.observations) || !snapshot.indicatorMetadata) {
    throw new Error("Expected a schemaVersion 2 World Bank snapshot");
  }
  const filtered = [];
  const countryMetadata = new Map((snapshot.countryMetadata ?? []).map((country) => [country.iso3, country]));
  let missing = 0;
  for (const row of snapshot.observations) {
    if (options.indicator && row.indicator !== options.indicator) continue;
    if (!options.indicator && !IMPORTABLE_INDICATORS[row.indicator]) continue;
    if (options.country && row.country !== options.country) continue;
    if (options.yearFrom !== undefined && row.year < options.yearFrom) continue;
    if (options.yearTo !== undefined && row.year > options.yearTo) continue;
    if (row.value === null || row.value === undefined) { missing += 1; continue; }
    if (typeof row.country !== "string" || !/^[A-Z]{3}$/.test(row.country) || !countryMetadata.has(row.country)) throw new Error(`Unrecognized country code ${row.country}`);
    if (!IMPORTABLE_INDICATORS[row.indicator]) throw new Error(`Indicator ${row.indicator} is not approved for database storage`);
    if (!Number.isInteger(row.year) || row.year < 1800 || row.year > 2200) throw new Error(`Invalid reference year ${row.year}`);
    const metadata = snapshot.indicatorMetadata[row.indicator];
    if (!metadata || typeof metadata !== "object") throw new Error(`Missing indicator metadata for ${row.indicator}`);
    const value = decimalString(row.value);
    if (metadata.unit !== IMPORTABLE_INDICATORS[row.indicator].unit) throw new Error(`${row.indicator}: unexpected unit ${metadata.unit}`);
    filtered.push({
      country: row.country,
      countryName: row.countryName,
      iso2: countryMetadata.get(row.country).iso2,
      countryMetadata: countryMetadata.get(row.country),
      indicator: row.indicator,
      year: row.year,
      value,
      metadata,
      license: IMPORTABLE_INDICATORS[row.indicator],
    });
  }
  const unique = new Map();
  let duplicates = 0;
  for (const row of filtered) {
    const key = `${row.indicator}:${row.country}:${row.year}`;
    const previous = unique.get(key);
    if (!previous) { unique.set(key, row); continue; }
    if (previous.value !== row.value) throw new Error(`Conflicting duplicate observation ${key}`);
    duplicates += 1;
  }
  return { observations: [...unique.values()].sort((a, b) => a.indicator.localeCompare(b.indicator) || a.country.localeCompare(b.country) || a.year - b.year), missing, duplicates };
}

export function localizedCountryNames(iso2, worldBankName) {
  if (!iso2) return Object.fromEntries(LOCALES.map((locale) => [locale, worldBankName ?? "World"]));
  return Object.fromEntries(LOCALES.map((locale) => {
    try { return [locale, new Intl.DisplayNames([locale], { type: "region" }).of(iso2) ?? worldBankName]; }
    catch { return [locale, worldBankName]; }
  }));
}
