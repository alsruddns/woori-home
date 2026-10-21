import type { MetadataRoute } from "next";
import { alternates, locales, origin, publicPortalPaths, publicDataPaths, localizedDataPaths } from "@/lib/site";
import { supportedCountries } from "@/lib/data-platform/countries";
import { indicators } from "@/lib/data-platform/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const portalAndOverview = locales.flatMap((locale) => publicPortalPaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: alternates(path),
  })).concat(publicDataPaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: alternates(path),
  }))));
  const countryDetails = locales.flatMap((locale) => supportedCountries.map(({ code }) => ({
    url: `${origin}/${locale}/countries/${code}`,
    alternates: alternates(`/countries/${code}`),
  })));
  const translatedDetails = (["ko", "en"] as const).flatMap((locale) => localizedDataPaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: { languages: { ko: `${origin}/ko${path}`, en: `${origin}/en${path}`, "x-default": `${origin}/en${path}` } },
  })));
  const energyDetails = locales.flatMap((locale) => indicators.filter((indicator) => indicator.id === "electricity-access").map((indicator) => {
    const path = `/${indicator.category}/${indicator.id}`;
    return { url: `${origin}/${locale}${path}`, alternates: alternates(path) };
  }));
  return portalAndOverview.concat(countryDetails, translatedDetails, energyDetails);
}
