import snapshot from "@/data/world-bank.json";

export const dataCountries = [
  { code: "au", iso3: "AUS" }, { code: "br", iso3: "BRA" }, { code: "ca", iso3: "CAN" },
  { code: "cn", iso3: "CHN" }, { code: "de", iso3: "DEU" }, { code: "fr", iso3: "FRA" },
  { code: "gb", iso3: "GBR" }, { code: "id", iso3: "IDN" }, { code: "in", iso3: "IND" },
  { code: "jp", iso3: "JPN" }, { code: "kr", iso3: "KOR" }, { code: "mx", iso3: "MEX" },
  { code: "ng", iso3: "NGA" }, { code: "us", iso3: "USA" }, { code: "za", iso3: "ZAF" },
] as const;

const catalog = (snapshot as typeof snapshot & { countryMetadata?: { iso3: string; iso2: string | null; isAggregate: boolean }[] }).countryMetadata ?? [];
// Comparison accepts all World Bank economies present in the reviewed country catalog.
export const supportedCountries = [...new Map([
  ...dataCountries,
  ...catalog.filter((country) => !country.isAggregate && country.iso2).map((country) => ({ code: country.iso2!.toLowerCase(), iso3: country.iso3 })),
].map((country) => [country.code, country])).values()].sort((a, b) => a.code.localeCompare(b.code));

export type CountryCode = (typeof supportedCountries)[number]["code"];
export function countryByCode(value: string) {
  return supportedCountries.find((country) => country.code === value.toLowerCase());
}
export function countryCodeForIso3(value: string) {
  return supportedCountries.find((country) => country.iso3 === value)?.code;
}
export function countryName(code: string, locale: string) {
  const country = countryByCode(code);
  if (!country) return code.toUpperCase();
  try { return new Intl.DisplayNames([locale], { type: "region" }).of(country.code.toUpperCase()) ?? country.code.toUpperCase(); }
  catch { return country.code.toUpperCase(); }
}
