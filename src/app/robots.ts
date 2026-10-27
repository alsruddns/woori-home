import type { MetadataRoute } from "next";
import { origin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/portal-api/"],
    },
    sitemap: [
      "sitemap.xml",
      "calculator-sitemap.xml",
      "tools-sitemap.xml",
      "docs-sitemap.xml",
      "quiz-sitemap.xml",
    ].map((path) => `${origin}/${path}`),
  };
}
