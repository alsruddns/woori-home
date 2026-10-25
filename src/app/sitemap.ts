import type { MetadataRoute } from "next";
import { alternates, locales, origin, publicDataPaths, publicPortalPaths } from "@/lib/site";
import { indicators } from "@/lib/data-platform/registry";
import { supportedCountries } from "@/lib/data-platform/countries";
import { latestForCountry } from "@/lib/data-platform/snapshot";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPaths = [...new Set([...publicPortalPaths, ...publicDataPaths])];
  const portalAndDataPages = locales.flatMap((locale) => publicPaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: alternates(path),
  })));
  const indexableIndicatorPages = indicators.flatMap((indicator) => ["ko", "en"].map((locale) => {
    const path = `/${indicator.category}/${indicator.id}`;
    return { url: `${origin}/${locale}${path}`, alternates: alternates(path) };
  }));
  const countryPaths = supportedCountries
    .filter((country) => latestForCountry("SP.POP.TOTL", country.iso3))
    .map((country) => `/countries/${country.code}`);
  const countryPages = locales.flatMap((locale) => countryPaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: alternates(path),
  })));

  return [...portalAndDataPages, ...indexableIndicatorPages, ...countryPages];
}
