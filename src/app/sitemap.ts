import type { MetadataRoute } from "next";
import { alternates, locales, origin } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((locale) => ({ url: `${origin}/${locale}`, alternates: alternates() }));
}
