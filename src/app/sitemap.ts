import type { MetadataRoute } from "next";
import { alternates, locales, origin } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) => [
    { url: `${origin}/${locale}`, alternates: alternates() },
    { url: `${origin}/${locale}/privacy`, alternates: alternates("/privacy") },
    { url: `${origin}/${locale}/terms`, alternates: alternates("/terms") },
  ]);
}
