export const datasetLocales = Object.freeze(["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"]);

const verifiedWorldBankIndicators = new Set([
  "EG.ELC.ACCS.ZS", "FP.CPI.TOTL.ZG", "NY.GDP.MKTP.CD", "NY.GDP.MKTP.KD.ZG",
  "NY.GDP.PCAP.CD", "NY.GDP.PCAP.KD", "SL.UEM.TOTL.ZS", "SP.DYN.LE00.IN",
  "SP.DYN.TFRT.IN", "SP.POP.GROW", "SP.POP.TOTL",
]);

export function countryDatasetLicense(indicatorCodes) {
  if (!Array.isArray(indicatorCodes) || indicatorCodes.length === 0) return undefined;
  if (!indicatorCodes.every((code) => verifiedWorldBankIndicators.has(code))) return undefined;
  return "https://creativecommons.org/licenses/by/4.0/";
}

function nonEmpty(parts) {
  return parts.map((part) => String(part ?? "").trim()).filter(Boolean).join(" ").replace(/\s+/g, " ");
}

export function createCountryDatasetDescription({ summary, country, iso3, measuresLabel, measures, periodLabel, period, source, caveat, updatedLabel, updatedAt }) {
  return nonEmpty([summary, `${country} (${iso3}).`, `${measuresLabel}: ${measures.join(", ") || "—"}.`, `${periodLabel}: ${period || "—"}.`, source, caveat, `${updatedLabel}: ${updatedAt}.`]);
}

export function createIndicatorDatasetDescription({ definition, interpretation, source, label, code, periodLabel, period }) {
  return nonEmpty([definition, interpretation, source, `${label} (${code}).`, `${periodLabel}: ${period || "—"}.`]);
}

export function validateDatasetSchema(dataset) {
  if (!dataset || typeof dataset !== "object") throw new TypeError("Dataset schema must be an object");
  if (typeof dataset.name !== "string" || !dataset.name.trim()) throw new Error("Dataset.name must not be empty");
  if (typeof dataset.description !== "string") throw new Error("Dataset.description must be text");
  const descriptionLength = Array.from(dataset.description.trim()).length;
  if (descriptionLength < 50 || descriptionLength > 5000) throw new Error("Dataset.description must contain 50 to 5000 characters");
  if (typeof dataset.url !== "string") throw new Error("Dataset.url must be an absolute HTTPS URL");
  let url;
  try { url = new URL(dataset.url); } catch { throw new Error("Dataset.url must be an absolute HTTPS URL"); }
  if (url.protocol !== "https:") throw new Error("Dataset.url must use HTTPS");
  if (dataset.license !== undefined) {
    let license;
    try { license = new URL(dataset.license); } catch { throw new Error("Dataset.license must be an absolute HTTPS URL"); }
    if (license.protocol !== "https:") throw new Error("Dataset.license must use HTTPS");
  }
  JSON.parse(JSON.stringify(dataset));
  return dataset;
}
