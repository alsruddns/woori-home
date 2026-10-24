import type { MetadataRoute } from "next";
import { alternates, locales, origin, publicPortalPaths } from "@/lib/site";
import { supportedCountries } from "@/lib/data-platform/countries";
import { latestForCountry } from "@/lib/data-platform/snapshot";

export default function sitemap(): MetadataRoute.Sitemap {
  const core = locales.flatMap((locale) => publicPortalPaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: alternates(path),
  })));
  const countryPaths = supportedCountries
    .filter((country) => latestForCountry("SP.POP.TOTL", country.iso3))
    .map((country) => `/countries/${country.code}`);
  return [...core, ...locales.flatMap((locale) => countryPaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: alternates(path),
  })))];
}
