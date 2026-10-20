import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const site = await readFile(new URL("../src/lib/site.ts", import.meta.url), "utf8");
const translations = await readFile(new URL("../src/lib/translations.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../src/app/(locale)/[locale]/portal-introduction.tsx", import.meta.url), "utf8");
const dashboardHome = await readFile(new URL("../src/app/(locale)/[locale]/page.tsx", import.meta.url), "utf8");
const platformHome = await readFile(new URL("../src/app/(locale)/[locale]/platform-home.tsx", import.meta.url), "utf8");
const categoryRoute = await readFile(new URL("../src/app/(locale)/[locale]/(platform)/[category]/page.tsx", import.meta.url), "utf8");
const stockPage = await readFile(new URL("../src/app/(locale)/[locale]/stock-market-dashboard.tsx", import.meta.url), "utf8");
const worldData = await readFile(new URL("../src/app/(locale)/[locale]/world-data.tsx", import.meta.url), "utf8");
const platformStyles = await readFile(new URL("../src/app/(locale)/[locale]/platform.css", import.meta.url), "utf8");
const portalFooter = await readFile(new URL("../src/app/(locale)/[locale]/portal-footer.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../src/app/(locale)/[locale]/layout.tsx", import.meta.url), "utf8");
const rootLayout = await readFile(new URL("../src/app/(root)/layout.tsx", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
const robots = await readFile(new URL("../src/app/robots.ts", import.meta.url), "utf8");
const privacyPage = await readFile(new URL("../src/app/(locale)/[locale]/privacy/page.tsx", import.meta.url), "utf8");
const termsPage = await readFile(new URL("../src/app/(locale)/[locale]/terms/page.tsx", import.meta.url), "utf8");
const contactDialog = await readFile(new URL("../src/app/(locale)/[locale]/contact-dialog.tsx", import.meta.url), "utf8");
const familyContact = await readFile(new URL("../src/lib/family-contact.ts", import.meta.url), "utf8");
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
const { familySiteHref } = require("../src/lib/family-sites.ts");
const { getLocalePath } = siteData;
const { portalContent, portalUpdates } = require("../src/lib/portal-content.ts");
const { stockCopy, weekdayNoSnapshot } = require("../src/lib/data-platform/stock-copy.ts");
const { classifyStockDate, adjacentAvailableDates } = require("../src/lib/data-platform/stock-selection.ts");
const { snapshotDatesForMarket, stockSnapshotForDate } = require("../src/lib/data-platform/mock-stocks.ts");
const { stockMarkets } = require("../src/lib/data-platform/registry.ts");

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
  assert.match(styles, /\.header-controls \.language-select\{width:auto;min-width:0!important/);
});

test("service links and featured detail links use locale-first URLs", () => {
  assert.equal(familySiteHref("ko", "moneyBook"), "/ko/money");
  assert.equal(familySiteHref("es", "moneyBook"), "/en/money");
  assert.equal(familySiteHref("pt-br", "docs"), "/pt-br/docs");
  assert.equal(familySiteHref("en", "quiz"), "/en/quiz");
  assert.match(home, /serviceHrefs\.money\(locale\)/);
  assert.match(home, /familySiteHref\(locale, "calculator"\)/);
  assert.match(home, /familySiteHref\(locale, "tools"\)/);
  assert.match(home, /`\/\$\{locale\}\/calculators\/\$\{item\.slug\}`/);
  assert.match(home, /`\/\$\{locale\}\/tools\/\$\{item\.slug\}`/);
  assert.doesNotMatch(home + site, /href=["']\/(?:calculator|tools|money)(?:["'/])/);
});

test("portal gives context before five useful service cards", () => {
  const servicesPosition = home.indexOf('<section className="services section-wrap"');
  const heroPosition = home.indexOf('<section className="hero">');
  const aboutPosition = home.indexOf('<section className="portal-about section-wrap"');
  const moneySectionPosition = home.indexOf('<section className="money-section">');
  assert.ok(heroPosition >= 0 && heroPosition < aboutPosition && aboutPosition < servicesPosition && servicesPosition < moneySectionPosition);
  assert.match(home, /familySiteHref\(locale, "docs"\)/);
  assert.match(home, /familySiteHref\(locale, "quiz"\)/);
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
  assert.equal((home.match(/key: "(?:calculators|tools|money|docs|quiz)" as const/g) ?? []).length, 5);
  assert.doesNotMatch(home, /closing-cta|closing-links/);
});

test("15 localized portal guides contain distinct service guidance, verified updates, and seven FAQs", () => {
  assert.deepEqual(Object.keys(portalContent), siteData.locales);
  assert.deepEqual(portalUpdates.map((item) => item.commit), ["3465555", "d7167de"]);
  for (const locale of siteData.locales) {
    const content = portalContent[locale];
    assert.ok(content.about.length > 100, `${locale} about`);
    assert.equal(content.audiences.length, 3);
    assert.equal(content.how.length, 3);
    assert.equal(content.reasons.length, 3);
    assert.equal(content.updates.length, portalUpdates.length);
    assert.equal(content.faq.length, 7);
    assert.deepEqual(Object.keys(content.details), ["calculator", "tools", "moneyBook", "docs", "quiz"]);
    assert.equal(new Set(Object.values(content.details)).size, 5);
    if (locale !== "en") assert.notEqual(content.about, portalContent.en.about, `${locale} English fallback`);
    for (const [question, answer] of content.faq) assert.ok(question && answer, `${locale} FAQ`);
  }
  for (const section of ["portal-about", "portal-how", "portal-why", "portal-updates", "portal-faq"]) assert.ok(home.includes(section), section);
});

test("canonical, hreflang, Open Graph, and JSON-LD use the www origin", () => {
  assert.match(site, /https:\/\/www\.woori\.today/);
  assert.match(layout, /canonical,\s*languages:\s*alternates\(\)\.languages/);
  assert.match(site, /hreflang: "pt-BR"/);
  assert.match(site, /hreflang: "zh-TW"/);
  assert.match(layout, /openGraph: \{[^}]*url: canonical/s);
  assert.match(home, /"@type": "WebSite"/);
  assert.match(platformHome, /"@type": "WebSite"/);
  assert.match(home + platformHome, /"@context": "https:\/\/schema\.org"/);
  assert.doesNotMatch(layout + home + dashboardHome + platformHome, /https?:\/\/(?:localhost|127\.0\.0\.1)/);
  assert.doesNotMatch(layout + home + dashboardHome + platformHome, /http:\/\/woori\.today/);
});

test("the new localized data home keeps the portal guide at about and preserves indexable SEO", () => {
  assert.match(dashboardHome, /PlatformLayout locale=\{locale\}/);
  assert.match(dashboardHome, /PlatformHome locale=\{locale\}/);
  assert.match(platformHome, /SP\.POP\.TOTL/);
  assert.match(platformHome, /NY\.GDP\.MKTP\.CD/);
  assert.match(platformHome, /mockDisclosure/);
  assert.match(categoryRoute, /category === "about" \? portalContent\[locale\]\.about/);
  assert.match(categoryRoute, /robots: \{ index: category === "about", follow: true \}/);
  assert.match(categoryRoute, /category === "about"\) return <PortalIntroduction locale=\{locale\} \/>/);
  assert.match(site, /publicDataPaths = \["\/world", "\/countries", "\/about"\]/);
  assert.doesNotMatch(site, /publicDataPaths = \[[^\]]*"\/stocks"/);
});

test("stock markets have translated names and every visible control in all 15 locales", () => {
  const expectedLocales = ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi"];
  assert.deepEqual(Object.keys(stockCopy).sort(), [...expectedLocales].sort());
  for (const locale of expectedLocales) {
    const copy = stockCopy[locale];
    assert.ok(copy.title && copy.description && copy.intro && copy.marketLabel && copy.dateLabel && copy.previousDate && copy.nextDate, `${locale}: market controls`);
    assert.ok(copy.mockLabel && copy.mockDisclosure && copy.sourceLabel && copy.sourceDisclosure, `${locale}: sample disclosure`);
    assert.ok(copy.noSnapshotTitle && weekdayNoSnapshot[locale] && copy.weekend && copy.futureDate && copy.invalidDate, `${locale}: empty and error states`);
    for (const market of ["us", "kospi", "kosdaq", "japan", "europe"]) assert.ok(copy.marketNames[market] && copy.venues[market], `${locale}: ${market}`);
    for (const sector of ["Technology", "Health", "Energy", "Consumer", "Finance", "Industrials"]) assert.ok(copy.sectors[sector], `${locale}: ${sector}`);
  }
  assert.notEqual(stockCopy.ko.marketNames.us, stockCopy.en.marketNames.us);
  assert.notEqual(stockCopy.ja.marketNames.japan, stockCopy.en.marketNames.japan);
  assert.equal(stockCopy.ko.marketNames.kospi, "대한민국");
  assert.equal(stockCopy.ko.marketNames.kosdaq, "대한민국");
  assert.equal(stockCopy.ja.marketNames.kospi, "韓国");
  assert.equal(stockCopy["zh-tw"].marketNames.europe, "歐洲");
  for (const locale of expectedLocales) {
    for (const region of Object.values(stockCopy[locale].marketNames)) assert.doesNotMatch(region, /\?/u, `${locale}: corrupted market region`);
  }
  assert.equal(stockMarkets.find((item) => item.id === "kospi").benchmark, "KOSPI");
  assert.equal(stockMarkets.find((item) => item.id === "kosdaq").benchmark, "KOSDAQ");
  assert.match(stockPage, /search\.get\("market"\)/);
  assert.match(stockPage, /search\.get\("date"\)/);
  assert.match(stockPage, /router\.push\(`\/\$\{locale\}\/stocks\?/);
  assert.match(stockPage, /snapshotDatesForMarket\(nextMarket\.id\)\.at\(-1\)/);
  assert.match(stockPage, /classifyStockDate/);
  assert.match(stockPage, /max=\{today\}/);
  assert.match(categoryRoute, /<Suspense fallback=\{<StockMarketLoading locale=\{locale\} \/>\}>/);
  assert.match(categoryRoute, /robots: \{ index: category === "about", follow: true \}/);
  assert.doesNotMatch(site, /publicDataPaths = \[[^\]]*"\/stocks"/);
});

test("stock date selection never substitutes another market date and distinguishes missing dates", () => {
  assert.deepEqual(snapshotDatesForMarket("us"), ["2026-10-19"]);
  assert.equal(stockSnapshotForDate("us", "2026-10-19").market, "us");
  assert.equal(stockSnapshotForDate("us", "2026-10-18"), undefined);
  assert.equal(classifyStockDate(["2026-10-19"], "2026-10-19", "2026-10-20"), "available");
  assert.equal(classifyStockDate(["2026-10-19"], "2026-10-18", "2026-10-20"), "weekend");
  assert.equal(classifyStockDate(["2026-10-19"], "2026-10-20", "2026-10-20"), "missing");
  assert.equal(classifyStockDate(["2026-10-19"], "2026-10-21", "2026-10-20"), "future");
  assert.equal(classifyStockDate(["2026-10-19"], "2026-13-01", "2026-10-20"), "invalid");
  assert.equal(classifyStockDate([], "2026-10-19", "2026-10-20"), "empty");
  assert.deepEqual(adjacentAvailableDates(["2026-10-21", "2026-10-19", "2026-10-20"], "2026-10-20"), { previous: "2026-10-19", next: "2026-10-21" });
});

test("market snapshots are disclosed, accessible, theme-aware, and free of internal labels", () => {
  assert.doesNotMatch(stockPage + worldData + platformHome, /WOORI\.DATA|MARKET SNAPSHOT UI|Market breadth prototype|Snapshot schema preview|Market cap weighted layout|6 mock securities/i);
  assert.match(stockPage, /role="note"/);
  assert.match(stockPage, /tabIndex=\{0\}/);
  assert.match(stockPage, /aria-label=\{accessibleName\}/);
  assert.match(stockPage, /changeTone/);
  assert.match(platformStyles, /\.platform-stock-tile\.is-flat/);
  assert.match(platformStyles, /html\[data-theme="light"\] \.platform-stock-tile\.is-up/);
  assert.match(platformStyles, /@media\(max-width:600px\).*platform-stock-tile/s);
  assert.doesNotMatch(stockPage, /licensedSource\}/);
});

test("root favicon and PNG site icons are declared and use square public PNG assets", async () => {
  const publicDir = new URL("../public/", import.meta.url);
  const [favicon, icon, appleIcon] = await Promise.all(["favicon.ico", "icon.png", "apple-icon.png"].map((file) => import("node:fs/promises").then(({ readFile }) => readFile(new URL(file, publicDir)))));
  assert.deepEqual([...favicon.subarray(0, 4)], [0, 0, 1, 0]);
  for (const [name, png, minimum] of [["icon.png", icon, 48], ["apple-icon.png", appleIcon, 180]]) {
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${name} PNG signature`);
    assert.equal(png.readUInt32BE(16), png.readUInt32BE(20), `${name} is square`);
    assert.ok(png.readUInt32BE(16) >= minimum, `${name} is at least ${minimum}px`);
  }
  assert.match(layout, /url: "\/favicon\.ico"/);
  assert.match(layout, /url: "\/icon\.png", type: "image\/png"/);
  assert.match(layout, /apple: "\/apple-icon\.png"/);
});

test("portal sitemap contains locale home and privacy pages with matching alternates", () => {
  assert.match(sitemap, /url: `\$\{origin\}\/\$\{locale\}\$\{path\}`/);
  assert.match(sitemap, /publicPortalPaths\.map/);
  assert.match(sitemap, /locales\.flatMap/);
  assert.match(sitemap, /flatMap/);
  assert.doesNotMatch(sitemap, /money|calculators|tools|docs|quiz/);
});

test("localized privacy pages have canonical, hreflang, content, and MoneyBook policy links", () => {
  for (const locale of ["ko", "en", "ja", "zh"]) assert.match(privacyCopy, new RegExp(`\\b${locale}: \\{`));
  assert.match(privacyPage, /canonical, languages: alternates\("\/privacy"\)\.languages/);
  assert.match(privacyPage, /familySiteHref\(locale, "moneyBook"\)\}\/privacy/);
  assert.match(privacyCopy, /Consent Mode/);
  assert.match(privacyCopy, /Google Analytics 4/);
  assert.match(privacyCopy, /Google AdSense/);
});

test("shared analytics gates AdSense when disabled and retains GA4 on each root layout", () => {
  assert.match(analytics, /NEXT_PUBLIC_ADS_ENABLED === "true"/);
  assert.match(analytics, /ADS_ENABLED \? <Script/);
  assert.match(analytics, /id="google-adsense"/);
  assert.ok(analytics.includes("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8033378933696766"));
  assert.match(analytics, /crossOrigin="anonymous"/);
  assert.equal((analytics.match(/id="google-adsense"/g) ?? []).length, 1);
  assert.equal((layout.match(/<Analytics\s*\/>/g) ?? []).length, 1);
  assert.equal((rootLayout.match(/<Analytics\s*\/>/g) ?? []).length, 1);
});

test("robots lists all six production sitemap endpoints", () => {
  for (const path of ["sitemap.xml", "calculator-sitemap.xml", "tools-sitemap.xml", "money-sitemap.xml", "docs-sitemap.xml", "quiz-sitemap.xml"]) assert.ok(robots.includes(path));
  assert.match(robots, /allow: "\/"/);
  assert.match(robots, /disallow: \["\/api\/"\]/);
});

test("privacy and terms routes plus the localized contact dialog are connected", () => {
  assert.match(privacyPage, /generateMetadata/);
  assert.match(termsPage, /generateMetadata/);
  assert.match(termsPage, /alternates\("\/terms"\)/);
  assert.match(home, /href=\{`\/\$\{locale\}\/privacy`\}/);
  assert.match(portalFooter, /href=\{`\/\$\{locale\}\/terms`\}/);
  assert.match(privacyPage, /<PortalFooter locale=\{locale\} \/>/);
  assert.match(termsPage, /<PortalFooter locale=\{locale\} \/>/);
  assert.match(contactDialog, /<dialog/);
  assert.match(contactDialog, /copy\.types\.map/);
  assert.match(contactDialog, /mailto:krdd125@gmail\.com/);
  assert.match(familyContact, /types: \[string, string, string, string\]/);
  for (const type of ["일반 문의", "협업", "광고", "버그"]) assert.ok(familyContact.includes(type));
});

test("published calculator and tool examples are represented by locale-first slugs", () => {
  for (const slug of ["percentage", "compound-interest", "savings-interest", "loan-interest", "ltv", "bmi", "dday", "unit-converter"]) assert.ok(site.includes(`slug: "${slug}"`));
  for (const slug of ["character-count", "json-formatter", "json-validator", "image-resize", "heic-to-jpg", "pdf-merge"]) assert.ok(site.includes(`slug: "${slug}"`));
});
