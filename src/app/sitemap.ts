import type { MetadataRoute } from "next";
import { alternates, alternatesForLocales, locales, origin, publicDataPaths, publicPortalPaths } from "@/lib/site";
import { indicators } from "@/lib/data-platform/registry";
import { supportedCountries } from "@/lib/data-platform/countries";
import { latestForCountry } from "@/lib/data-platform/snapshot";
import { guideLocales, guides } from "@/lib/data-platform/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  // These market overviews contain reviewed, persisted data and have a localized
  // canonical page. Dated query URLs remain user navigation only and are omitted.
  const publicPaths = [...new Set([...publicPortalPaths, ...publicDataPaths, "/markets", "/crypto", "/gold"])];
  const portalAndDataPages = locales.flatMap((locale) => publicPaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: alternates(path),
  })));
  const indexableIndicatorPages = indicators.flatMap((indicator) => {
    const path = `/${indicator.category}/${indicator.id}`;
    const indexableLocales = indicator.category === "world"
      ? (["ko", "en"] as const)
      : locales.filter((locale) => Boolean(indicator.definition[locale] && indicator.interpretation[locale]));
    const preferredDefault = indicator.category === "world" || indicator.id === "electricity-access" ? "ko" : "en";
    const defaultLocale = indexableLocales.includes(preferredDefault) ? preferredDefault : indexableLocales[0] ?? "en";
    return indexableLocales.map((locale) => ({
      url: `${origin}/${locale}${path}`,
      alternates: alternatesForLocales(path, indexableLocales, defaultLocale),
    }));
  });
  const countryPaths = supportedCountries
    .filter((country) => latestForCountry("SP.POP.TOTL", country.iso3))
    .map((country) => `/countries/${country.code}`);
  const countryPages = locales.flatMap((locale) => countryPaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: alternates(path),
  })));
  const guidePaths = ["/guides", ...guides.map((guide) => `/guides/${guide.slug}`)];
  const guidePages = guideLocales.flatMap((locale) => guidePaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: alternatesForLocales(path, guideLocales, "en"),
  })));

  return [...portalAndDataPages, ...indexableIndicatorPages, ...countryPages, ...guidePages];
}
