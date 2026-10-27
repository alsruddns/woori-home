import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("published guides keep verified Korean and English source-backed articles", async () => {
  const source = await read("../src/lib/data-platform/guides.ts");
  const expected = [
    "crypto-price-observations",
    "gold-monthly-average-and-units",
    "compare-country-gdp",
    "sec-company-fundamentals",
    "research-paper-dates-and-metadata",
  ];
  for (const slug of expected) assert.equal(source.split(`slug: "${slug}"`).length - 1, 1, slug);
  assert.match(source, /export const guideLocales = \["ko", "en"\]/);
  assert.match(source, /국내총생산/);
  assert.match(source, /createdAt: "2026-10-27"/);
  assert.match(source, /reviewedAt: "2026-10-27"/);
  assert.match(source, /https:\/\/alternative\.me\/crypto\/api\//);
  assert.match(source, /https:\/\/www\.worldbank\.org\/en\/research\/commodity-markets/);
  assert.match(source, /https:\/\/data\.worldbank\.org\/indicator\/NY\.GDP\.MKTP\.CD/);
  assert.match(source, /https:\/\/www\.sec\.gov\/edgar\/sec-api-documentation/);
  assert.match(source, /https:\/\/www\.crossref\.org\/documentation\/retrieve-metadata\/rest-api\//);
  assert.match(source, /not investment advice/);
});

test("guide pages search headings and body text, publish only reviewed language versions, and expose article metadata", async () => {
  const [list, detail, sitemap, related] = await Promise.all([
    read("../src/app/(locale)/[locale]/(platform)/guides/page.tsx"),
    read("../src/app/(locale)/[locale]/(platform)/guides/[slug]/page.tsx"),
    read("../src/app/sitemap.ts"),
    read("../src/app/(locale)/[locale]/related-guides.tsx"),
  ]);
  assert.match(list, /guide\.sections\[locale\]/);
  assert.match(list, /guide\.searchTerms\[locale\]/);
  assert.match(list, /robots: \{ index: isGuideLocale\(locale\)/);
  assert.match(list, /guide-language-notice/);
  assert.match(detail, /"@type": "Article"/);
  assert.match(detail, /datePublished: guide\.createdAt/);
  assert.match(detail, /tableOfContents/);
  assert.match(detail, /guide\.sources\[locale\]/);
  assert.match(detail, /publishedLocale \? alternatesForLocales/);
  assert.match(sitemap, /guideLocales\.flatMap/);
  assert.match(sitemap, /guidePaths/);
  assert.match(related, /locale !== "ko" && locale !== "en"/);
});

test("financial data pages link to their matching guides instead of adding unrelated copy", async () => {
  const paths = [
    "../src/app/(locale)/[locale]/(platform)/markets/page.tsx",
    "../src/app/(locale)/[locale]/crypto-dashboard.tsx",
    "../src/app/(locale)/[locale]/(platform)/gold/gold-page.tsx",
    "../src/app/(locale)/[locale]/(platform)/papers/page.tsx",
    "../src/app/(locale)/[locale]/stock-market-dashboard.tsx",
    "../src/app/(locale)/[locale]/world-data.tsx",
  ];
  const files = await Promise.all(paths.map(read));
  for (const file of files) assert.match(file, /RelatedGuides/);
});
