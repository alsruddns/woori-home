import type { MetadataRoute } from "next";
import { alternates, locales, origin, publicPortalPaths, publicDataPaths } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) => publicPortalPaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: alternates(path),
  })).concat(publicDataPaths.map((path) => ({
    url: `${origin}/${locale}${path}`,
    alternates: alternates(path),
  }))));
}
