export const dataCountries = [
  { code: "au", iso3: "AUS" }, { code: "br", iso3: "BRA" }, { code: "ca", iso3: "CAN" },
  { code: "cn", iso3: "CHN" }, { code: "de", iso3: "DEU" }, { code: "fr", iso3: "FRA" },
  { code: "gb", iso3: "GBR" }, { code: "id", iso3: "IDN" }, { code: "in", iso3: "IND" },
  { code: "jp", iso3: "JPN" }, { code: "kr", iso3: "KOR" }, { code: "mx", iso3: "MEX" },
  { code: "ng", iso3: "NGA" }, { code: "us", iso3: "USA" }, { code: "za", iso3: "ZAF" },
] as const;

// Comparison accepts additional valid country codes so missing observations can be shown explicitly.
export const supportedCountries = [
  ...dataCountries,
  { code: "ch", iso3: "CHE" }, { code: "ru", iso3: "RUS" }, { code: "sa", iso3: "SAU" },
  { code: "es", iso3: "ESP" }, { code: "tr", iso3: "TUR" },
] as const;

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
