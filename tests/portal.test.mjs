import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const site = await readFile(new URL("../src/lib/site.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../src/app/(locale)/[locale]/page.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../src/app/(locale)/[locale]/layout.tsx", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
const robots = await readFile(new URL("../src/app/robots.ts", import.meta.url), "utf8");
const privacyPage = await readFile(new URL("../src/app/(locale)/[locale]/privacy/page.tsx", import.meta.url), "utf8");
const privacyCopy = await readFile(new URL("../src/lib/privacy.ts", import.meta.url), "utf8");

test("portal defines all supported locales and localized home content", () => {
  for (const locale of ["ko", "en", "ja", "zh"]) {
    assert.match(site, new RegExp(`\\b${locale}: \\{`));
    assert.match(site, new RegExp(`\\b${locale}: "`));
  }
  assert.match(layout, /if \(!isLocale\(locale\)\) notFound\(\)/);
});

test("service links and featured detail links use locale-first URLs", () => {
  assert.match(home, /`\/\$\{locale\}\/money`/);
  assert.match(home, /`\/\$\{locale\}\/calculators`/);
  assert.match(home, /`\/\$\{locale\}\/tools`/);
  assert.match(home, /`\/\$\{locale\}\/calculators\/\$\{item\.slug\}`/);
  assert.match(home, /`\/\$\{locale\}\/tools\/\$\{item\.slug\}`/);
  assert.doesNotMatch(home + site, /href=["']\/(?:calculator|tools|money)(?:["'/])/);
});

test("canonical, hreflang, Open Graph, and JSON-LD use the www origin", () => {
  assert.match(site, /https:\/\/www\.woori\.today/);
  assert.match(layout, /canonical,\s*languages:\s*\{\s*ko:/);
  assert.match(layout, /openGraph: \{[^}]*url: canonical/s);
  assert.match(home, /"@type": "WebSite"/);
  assert.match(home, /"@context": "https:\/\/schema\.org"/);
  assert.doesNotMatch(layout + home, /https?:\/\/(?:localhost|127\.0\.0\.1)/);
  assert.doesNotMatch(layout + home, /http:\/\/woori\.today/);
});

test("portal sitemap contains locale home and privacy pages with matching alternates", () => {
  assert.match(sitemap, /url: `\$\{origin\}\/\$\{locale\}`/);
  assert.match(sitemap, /url: `\$\{origin\}\/\$\{locale\}\/privacy`/);
  assert.match(sitemap, /alternates\("\/privacy"\)/);
  assert.match(sitemap, /locales\.flatMap/);
  assert.match(sitemap, /flatMap/);
  assert.doesNotMatch(sitemap, /money|calculators|tools/);
});

test("localized privacy pages have canonical, hreflang, content, and MoneyBook policy links", () => {
  for (const locale of ["ko", "en", "ja", "zh"]) assert.match(privacyCopy, new RegExp(`\\b${locale}: \\{`));
  assert.match(privacyPage, /canonical, languages: alternates\("\/privacy"\)\.languages/);
  assert.match(privacyPage, /\$\{locale\}\/money\/privacy/);
  assert.match(privacyCopy, /Consent Mode/);
  assert.match(privacyCopy, /Google Analytics 4/);
  assert.match(privacyCopy, /Google AdSense/);
});

test("robots lists all four production sitemap endpoints", () => {
  for (const path of ["sitemap.xml", "calculator-sitemap.xml", "tools-sitemap.xml", "money-sitemap.xml"]) assert.ok(robots.includes(path));
  assert.match(robots, /allow: "\/"/);
});

test("published calculator and tool examples are represented by locale-first slugs", () => {
  for (const slug of ["percentage", "compound-interest", "savings-interest", "loan-interest", "ltv", "bmi", "dday", "unit-converter"]) assert.ok(site.includes(`slug: "${slug}"`));
  for (const slug of ["character-count", "json-formatter", "json-validator", "image-resize", "heic-to-jpg", "pdf-merge"]) assert.ok(site.includes(`slug: "${slug}"`));
});
