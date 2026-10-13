import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const site = await readFile(new URL("../src/lib/site.ts", import.meta.url), "utf8");
const translations = await readFile(new URL("../src/lib/translations.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../src/app/(locale)/[locale]/page.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../src/app/(locale)/[locale]/layout.tsx", import.meta.url), "utf8");
const rootLayout = await readFile(new URL("../src/app/(root)/layout.tsx", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
const robots = await readFile(new URL("../src/app/robots.ts", import.meta.url), "utf8");
const privacyPage = await readFile(new URL("../src/app/(locale)/[locale]/privacy/page.tsx", import.meta.url), "utf8");
const privacyCopy = await readFile(new URL("../src/lib/privacy.ts", import.meta.url), "utf8");
const analytics = await readFile(new URL("../src/app/analytics.tsx", import.meta.url), "utf8");
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  module._compile(output, filename);
};
const siteData = require("../src/lib/site.ts");
const privacyData = require("../src/lib/privacy.ts");
const termsData = require("../src/lib/terms.ts");
const notFoundData = require("../src/lib/not-found.ts");
const { getLocalePath } = siteData;

test("portal defines all supported locales and localized home content", () => {
  for (const locale of ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi"]) assert.ok(site.includes(`route: "${locale}"`), `missing locale config: ${locale}`);
  for (const locale of ["ko", "en", "ja", "zh"]) assert.match(site, new RegExp(`\\b${locale}: \\{`));
  for (const locale of ["es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi"]) assert.ok(translations.includes(`${locale}: {`) || translations.includes(`"${locale}": {`), `missing home translation: ${locale}`);
  assert.match(layout, /if \(!isLocale\(locale\)\) notFound\(\)/);
});

test("all locale dictionaries, legal pages, and service names are complete without English fallbacks", () => {
  const errors = [];
  const expectedLocales = ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi"];
  const baseKeys = Object.keys(siteData.messages.en).sort();
  for (const locale of expectedLocales) {
    const home = siteData.messages[locale];
    if (!home) { errors.push(`${locale}: missing home dictionary`); continue; }
    const missing = baseKeys.filter((key) => !(key in home));
    if (missing.length) errors.push(`${locale}: home keys ${missing.join(", ")}`);
    if (!notFoundData.notFoundMessages[locale]) errors.push(`${locale}: missing 404 copy`);
    if (!siteData.newTabLabels[locale]) errors.push(`${locale}: missing new-tab accessibility label`);
    if (!siteData.uiLabels[locale]?.language || !siteData.uiLabels[locale]?.primaryNav) errors.push(`${locale}: missing accessibility labels`);
    if (!siteData.sectionLabels[locale]?.calculator || !siteData.sectionLabels[locale]?.tools) errors.push(`${locale}: missing service section labels`);
    for (const [kind, dictionary, count] of [["privacy", privacyData.privacyContent, 10], ["terms", termsData.termsContent, 13]]) {
      const copy = dictionary[locale];
      if (!copy) { errors.push(`${locale}: missing ${kind} dictionary`); continue; }
      if (copy.sections.length !== count) errors.push(`${locale}: ${kind} expected ${count} sections, got ${copy.sections.length}`);
      if (locale !== "en") {
        for (const section of copy.sections) {
          if (section.body === dictionary.en.sections.find((item) => item.title.split(". ")[0] === section.title.split(". ")[0])?.body) errors.push(`${locale}: English fallback in ${kind} ${section.title}`);
        }
      }
    }
    for (const item of [...siteData.calculators, ...siteData.tools]) {
      if (!item.names[locale]) errors.push(`${locale}: missing service name ${item.slug}`);
      else if (locale !== "en" && item.names[locale] === item.names.en) errors.push(`${locale}: English service name ${item.slug}`);
    }
  }
  assert.deepEqual(errors, [], errors.join("\n"));
});

test("sitemap has 45 canonical portal URLs with 15 hreflang entries and x-default", () => {
  const entries = siteData.locales.flatMap((locale) => siteData.publicPortalPaths.map((path) => ({ url: `${siteData.origin}/${locale}${path}`, languages: siteData.alternates(path).languages })));
  assert.equal(entries.length, 45);
  assert.equal(new Set(entries.map((entry) => entry.url)).size, 45);
  for (const entry of entries) {
    assert.equal(Object.keys(entry.languages).length, 16);
    assert.equal(entry.languages["x-default"], entry.url.replace(/^https:\/\/www\.woori\.today\/(?:[^/]+)(.*)$/, "https://www.woori.today/ko$1"));
  }
});

test("language selection preserves each supported page path", async () => {
  assert.equal(getLocalePath("/ko/privacy", "es"), "/es/privacy");
  assert.equal(getLocalePath("/es/terms", "de"), "/de/terms");
  assert.equal(getLocalePath("/ja", "hi"), "/hi");
  const selector = require("node:fs").readFileSync(new URL("../src/app/(locale)/[locale]/language-selector.tsx", import.meta.url), "utf8");
  assert.match(selector, /aria-label=\{uiLabels\[locale\]\.language\}/);
  assert.match(selector, /value=\{locale\}/);
  assert.match(selector, /locales\.map/);
  const styles = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /\.language-select\{min-width:160px/);
  assert.match(styles, /@media\(max-width:680px\)\{\.language-select\{min-width:160px;max-width:180px/);
});

test("service links and featured detail links use locale-first URLs", () => {
  assert.match(home, /`\/\$\{locale\}\/money`/);
  assert.match(home, /`\/\$\{locale\}\/calculators`/);
  assert.match(home, /`\/\$\{locale\}\/tools`/);
  assert.match(home, /`\/\$\{locale\}\/calculators\/\$\{item\.slug\}`/);
  assert.match(home, /`\/\$\{locale\}\/tools\/\$\{item\.slug\}`/);
  assert.doesNotMatch(home + site, /href=["']\/(?:calculator|tools|money)(?:["'/])/);
});

test("featured services lead the home page and open locale-preserving service links in new tabs", () => {
  const headerPosition = home.indexOf('<header className="site-header">');
  const servicesPosition = home.indexOf('<section className="services section-wrap"');
  const heroPosition = home.indexOf('<section className="hero">');
  const moneySectionPosition = home.indexOf('<section className="money-section">');
  assert.ok(headerPosition >= 0 && headerPosition < servicesPosition);
  assert.ok(servicesPosition < heroPosition && heroPosition < moneySectionPosition);
  assert.match(home, /const serviceHrefs = \{ money: \(locale: Locale\) => `\/\$\{locale\}\/money`, calculators: \(locale: Locale\) => `\/\$\{locale\}\/calculators`, tools: \(locale: Locale\) => `\/\$\{locale\}\/tools` \}/);
  assert.match(home, /<a className=\{`\$\{service\.className\} service-card-link`\} href=\{service\.href\} key=\{service\.key\} target="_blank" rel="noopener noreferrer" aria-label=\{/);
  assert.match(home, /newTabLabels\[locale\]/);
  assert.match(home, /<h2 id="services-heading">\{copy\.featured\}<\/h2>/);
  assert.doesNotMatch(home, /01 \/ WOORI\.TODAY/);
  const cardsStart = home.indexOf("{services.map((service, index) =>");
  const cardsEnd = home.indexOf(")}</div></section>", cardsStart);
  assert.ok(cardsStart >= 0 && cardsEnd > cardsStart, "featured card list should render");
  const cardMarkup = home.slice(cardsStart, cardsEnd);
  assert.equal((cardMarkup.match(/<a\b/g) ?? []).length, 1, "each repeated card template has exactly one link");
  assert.doesNotMatch(cardMarkup, /<article\b|<button\b|<a\b.*<a\b/s, "service cards must not contain nested interactive elements");
  assert.match(cardMarkup, /<span className="text-link" aria-hidden="true">\{service\.cta\}/);
  assert.doesNotMatch(home, /className="button button-primary" href=\{serviceHrefs\.money\(locale\)\}/);
  assert.match(site, /export const newTabLabels: Record<Locale, string>/);
});

test("canonical, hreflang, Open Graph, and JSON-LD use the www origin", () => {
  assert.match(site, /https:\/\/www\.woori\.today/);
  assert.match(layout, /canonical,\s*languages:\s*alternates\(\)\.languages/);
  assert.match(site, /hreflang: "pt-BR"/);
  assert.match(site, /hreflang: "zh-TW"/);
  assert.match(layout, /openGraph: \{[^}]*url: canonical/s);
  assert.match(home, /"@type": "WebSite"/);
  assert.match(home, /"@context": "https:\/\/schema\.org"/);
  assert.doesNotMatch(layout + home, /https?:\/\/(?:localhost|127\.0\.0\.1)/);
  assert.doesNotMatch(layout + home, /http:\/\/woori\.today/);
});

test("portal sitemap contains locale home and privacy pages with matching alternates", () => {
  assert.match(sitemap, /url: `\$\{origin\}\/\$\{locale\}\$\{path\}`/);
  assert.match(sitemap, /publicPortalPaths\.map/);
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

test("shared analytics component loads AdSense once alongside GA4 on each root layout", () => {
  assert.match(analytics, /id="google-adsense"/);
  assert.ok(analytics.includes("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8033378933696766"));
  assert.match(analytics, /crossOrigin="anonymous"/);
  assert.equal((analytics.match(/id="google-adsense"/g) ?? []).length, 1);
  assert.equal((layout.match(/<Analytics\s*\/>/g) ?? []).length, 1);
  assert.equal((rootLayout.match(/<Analytics\s*\/>/g) ?? []).length, 1);
});

test("robots lists all four production sitemap endpoints", () => {
  for (const path of ["sitemap.xml", "calculator-sitemap.xml", "tools-sitemap.xml", "money-sitemap.xml"]) assert.ok(robots.includes(path));
  assert.match(robots, /allow: "\/"/);
});

test("published calculator and tool examples are represented by locale-first slugs", () => {
  for (const slug of ["percentage", "compound-interest", "savings-interest", "loan-interest", "ltv", "bmi", "dday", "unit-converter"]) assert.ok(site.includes(`slug: "${slug}"`));
  for (const slug of ["character-count", "json-formatter", "json-validator", "image-resize", "heic-to-jpg", "pdf-merge"]) assert.ok(site.includes(`slug: "${slug}"`));
});
