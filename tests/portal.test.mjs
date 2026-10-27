import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

const site = await readFile(new URL("../src/lib/site.ts", import.meta.url), "utf8");
const translations = await readFile(new URL("../src/lib/translations.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../src/app/(locale)/[locale]/portal-introduction.tsx", import.meta.url), "utf8");
const dashboardHome = await readFile(new URL("../src/app/(locale)/[locale]/page.tsx", import.meta.url), "utf8");
const platformHome = await readFile(new URL("../src/app/(locale)/[locale]/platform-home.tsx", import.meta.url), "utf8");
const categoryRoute = await readFile(new URL("../src/app/(locale)/[locale]/(platform)/[category]/page.tsx", import.meta.url), "utf8");
const stockPage = await readFile(new URL("../src/app/(locale)/[locale]/stock-market-dashboard.tsx", import.meta.url), "utf8");
const cryptoPage = await readFile(new URL("../src/app/(locale)/[locale]/crypto-dashboard.tsx", import.meta.url), "utf8");
const companyFactsPanel = await readFile(new URL("../src/app/(locale)/[locale]/company-fundamentals-panel.tsx", import.meta.url), "utf8");
const companyFactsPeriods = await readFile(new URL("../src/lib/data-platform/company-facts-period-copy.ts", import.meta.url), "utf8");
const companyFactsStatus = await readFile(new URL("../src/lib/data-platform/company-facts-status-copy.ts", import.meta.url), "utf8");
const platformStyles = await readFile(new URL("../src/app/(locale)/[locale]/platform.css", import.meta.url), "utf8");
const platformExperienceStyles = await readFile(new URL("../src/app/(locale)/[locale]/platform-experience.css", import.meta.url), "utf8");
const worldData = await readFile(new URL("../src/app/(locale)/[locale]/world-data.tsx", import.meta.url), "utf8");
const portalFooter = await readFile(new URL("../src/app/(locale)/[locale]/portal-footer.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../src/app/(locale)/[locale]/layout.tsx", import.meta.url), "utf8");
const platformLayout = await readFile(new URL("../src/app/(locale)/[locale]/platform-layout.tsx", import.meta.url), "utf8");
const platformControls = await readFile(new URL("../src/app/(locale)/[locale]/platform-controls.tsx", import.meta.url), "utf8");
const platformSidebar = await readFile(new URL("../src/app/(locale)/[locale]/platform-sidebar.tsx", import.meta.url), "utf8");
const categoryNavigation = await readFile(new URL("../src/lib/data-platform/category-navigation.ts", import.meta.url), "utf8");
const datePicker = await readFile(new URL("../src/app/(locale)/[locale]/date-picker.tsx", import.meta.url), "utf8");
const datePickerStyles = await readFile(new URL("../src/app/(locale)/[locale]/date-picker.css", import.meta.url), "utf8");
const datePickerCopySource = await readFile(new URL("../src/lib/date-picker-copy.ts", import.meta.url), "utf8");
const scienceDateExplorer = await readFile(new URL("../src/app/(locale)/[locale]/science-date-explorer.tsx", import.meta.url), "utf8");
const rootProxy = await readFile(new URL("../src/proxy.ts", import.meta.url), "utf8");
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
const { platformCopy } = require("../src/lib/data-platform/locales.ts");
const { stockCopy, weekdayNoSnapshot } = require("../src/lib/data-platform/stock-copy.ts");
const { categoryNavigation: getCategoryNavigation } = require("../src/lib/data-platform/category-navigation.ts");
const { classifyStockDate, adjacentAvailableDates } = require("../src/lib/data-platform/stock-selection.ts");
const { snapshotDatesForMarket, stockSnapshotForDate } = require("../src/lib/data-platform/published-stocks.ts");
const { stockMarkets, indicators } = require("../src/lib/data-platform/registry.ts");
const { financialOverviewCopy } = require("../src/lib/data-platform/financial-overview-copy.ts");
const { financialUiCopy } = require("../src/lib/data-platform/financial-ui-copy.ts");
const { cryptoDirectoryCopy } = require("../src/lib/data-platform/crypto-directory-copy.ts");

test("portal defines all supported locales and localized home content", () => {
  for (const locale of ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"]) assert.ok(site.includes(`route: "${locale}"`), `missing locale config: ${locale}`);
  for (const locale of ["ko", "en", "ja", "zh"]) assert.match(site, new RegExp(`\\b${locale}: \\{`));
  for (const locale of ["es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"]) assert.ok(translations.includes(`${locale}: {`) || translations.includes(`"${locale}": {`), `missing home translation: ${locale}`);
  assert.match(layout, /if \(!isLocale\(locale\)\) notFound\(\)/);
});

test("all locale dictionaries, legal pages, and service names are complete without English fallbacks", () => {
  const errors = [];
  const expectedLocales = ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"];
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

test("sitemap and hreflang include only indexable indicator locales", async () => {
  const publicPaths = [...new Set([...siteData.publicPortalPaths, ...siteData.publicDataPaths])];
  const entries = siteData.locales.flatMap((locale) => publicPaths.map((path) => ({ url: `${siteData.origin}/${locale}${path}`, languages: siteData.alternates(path).languages })));
  assert.equal(entries.length, 26 * publicPaths.length);
  assert.equal(new Set(entries.map((entry) => entry.url)).size, entries.length);
  for (const entry of entries) {
    assert.equal(Object.keys(entry.languages).length, 27);
    assert.equal(entry.languages["x-default"], entry.url.replace(/^https:\/\/www\.woori\.today\/(?:[^/]+)(.*)$/, "https://www.woori.today/ko$1"));
  }
  assert.equal(indicators.length, 11);
  assert.match(sitemap, /publicDataPaths/);
  assert.match(sitemap, /indexableIndicatorPages/);
  assert.match(sitemap, /\["ko", "en"\]/);
  assert.match(sitemap, /indicator\.definition\[locale\].*indicator\.interpretation\[locale\]/);
  const fullLocaleIndicator = indicators.find((indicator) => indicator.id === "electricity-access");
  const fullLocaleAlternates = siteData.alternatesForLocales("/energy/electricity-access", siteData.locales, "ko").languages;
  assert.equal(Object.keys(fullLocaleAlternates).length, 27);
  assert.equal(fullLocaleAlternates["x-default"], "https://www.woori.today/ko/energy/electricity-access");
  assert.ok(siteData.locales.every((locale) => fullLocaleIndicator.definition[locale] && fullLocaleIndicator.interpretation[locale]));
  const twoLocaleAlternates = siteData.alternatesForLocales("/world/population", ["ko", "en"], "ko").languages;
  assert.deepEqual(Object.keys(twoLocaleAlternates).sort(), ["en", "ko", "x-default"]);
  assert.equal(twoLocaleAlternates["x-default"], "https://www.woori.today/ko/world/population");
  const [categoryRoute, worldIndicatorRoute] = await Promise.all([
    readFile(new URL("../src/app/(locale)/[locale]/(platform)/[category]/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(locale)/[locale]/(platform)/world/[slug]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(categoryRoute, /indexableLocales = locales\.filter/);
  assert.match(categoryRoute, /localized \? \{ languages:/);
  assert.match(worldIndicatorRoute, /alternatesForLocales\(path, \["ko", "en"\], "ko"\)/);
  assert.match(worldIndicatorRoute, /indexable \? \{ languages:/);
});

test("financial dashboard and market labels are translated for every locale", () => {
  assert.deepEqual(Object.keys(financialOverviewCopy).sort(), [...siteData.locales].sort());
  assert.deepEqual(Object.keys(financialUiCopy).sort(), [...siteData.locales].sort());
  for (const locale of siteData.locales) {
    for (const [key, value] of Object.entries(financialOverviewCopy[locale])) assert.ok(value.trim(), `${locale}: missing finance overview ${key}`);
    for (const [key, value] of Object.entries(financialUiCopy[locale])) assert.ok(value.trim(), `${locale}: missing financial UI ${key}`);
    if (locale !== "en") assert.notEqual(financialOverviewCopy[locale].title, financialOverviewCopy.en.title, `${locale}: English fallback in finance page`);
  }
});

test("crypto search labels cover all locales and the market overview leads with SEC data", async () => {
  assert.deepEqual(Object.keys(cryptoDirectoryCopy).sort(), [...siteData.locales].sort());
  for (const locale of siteData.locales) {
    for (const [key, value] of Object.entries(cryptoDirectoryCopy[locale])) assert.ok(value.trim(), `${locale}: missing crypto directory ${key}`);
  }
  const [financeDashboard, categoryPage, cryptoPageCopy] = await Promise.all([
    readFile(new URL("../src/app/(locale)/[locale]/financial-overview-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(locale)/[locale]/(platform)/[category]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/data-platform/crypto-page-copy.ts", import.meta.url), "utf8"),
  ]);
  assert.match(financeDashboard, /CompanyFinancialTreemap locale=\{locale\}/);
  assert.match(financeDashboard, /router\.push\(`\/\$\{locale\}\/stocks#company-fundamentals-title`\)/);
  assert.doesNotMatch(financeDashboard, /fetch\(/);
  assert.match(cryptoPage, /<h1>\{copy\.title\}<\/h1>/);
  assert.match(categoryPage, /FinancialOverviewDashboard locale=\{locale\}/);
  assert.match(categoryPage, /getCryptoPageCopy\(locale\)\.title/);
  const dailyDescriptionBlock = cryptoPageCopy.match(/const dailyMarketDescription: Record<Locale, string> = \{([\s\S]*?)\n\};/)?.[1] ?? "";
  const dailyDescriptionLocales = [...dailyDescriptionBlock.matchAll(/^\s*(?:"([a-z-]+)"|([a-z]+)):/gm)].map((match) => match[1] ?? match[2]).sort();
  assert.deepEqual(dailyDescriptionLocales, [...siteData.locales].sort());
  assert.match(cryptoPageCopy, /daily UTC observations of Alternative\.me/);
  assert.doesNotMatch(cryptoPageCopy, /finalized exchange daily candles/);
  assert.match(stockPage, /CompanyFundamentalsPanel locale=\{locale\}/);
  assert.match(stockPage, /CompanyFundamentalsPanel locale=\{locale\} compactHeader/);
  assert.match(companyFactsPanel, /compactHeader \? "company-financial-treemap-title"/);
  assert.match(platformExperienceStyles, /\.company-fundamentals\.is-compact \.company-financial-treemap-controls/);
  assert.match(companyFactsPanel, /companySearchAliases\(row\.ticker\)/);
  assert.match(companyFactsPanel, /locale === "ko"/);
});

test("native selects follow the site theme and expose a visible keyboard focus", () => {
  assert.match(platformExperienceStyles, /\.platform-shell select,\s*\.platform-shell option\s*\{\s*color-scheme: dark/);
  assert.match(platformExperienceStyles, /html\[data-theme="light"\] \.platform-shell select,\s*html\[data-theme="light"\] \.platform-shell option/);
  assert.match(platformExperienceStyles, /\.platform-shell select:focus-visible/);
});

test("language selection preserves each supported page path", async () => {
  assert.equal(getLocalePath("/ko/privacy", "es"), "/es/privacy");
  assert.equal(getLocalePath("/es/terms", "de"), "/de/terms");
  assert.equal(getLocalePath("/ja", "hi"), "/hi");
  for (const locale of siteData.locales) assert.equal(getLocalePath(`/${locale}/countries/us`, "pt-br"), "/pt-br/countries/us");
  assert.equal(getLocalePath("/countries/us", "nl"), "/nl/countries/us");
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
  assert.doesNotMatch(home, /serviceHrefs\.money\(locale\)/);
  assert.match(home, /familySiteHref\(locale, "calculator"\)/);
  assert.match(home, /familySiteHref\(locale, "tools"\)/);
  assert.match(home, /`\/\$\{locale\}\/calculators\/\$\{item\.slug\}`/);
  assert.match(home, /`\/\$\{locale\}\/tools\/\$\{item\.slug\}`/);
  assert.doesNotMatch(home + site, /href=["']\/(?:calculator|tools|money)(?:["'/])/);
});

test("portal gives context before four active service cards and hides MoneyBook promotion", () => {
  const servicesPosition = home.indexOf('<section className="services section-wrap"');
  const heroPosition = home.indexOf('<section className="hero">');
  const aboutPosition = home.indexOf('<section className="portal-about section-wrap"');
  assert.ok(heroPosition >= 0 && heroPosition < aboutPosition && aboutPosition < servicesPosition);
  assert.doesNotMatch(home, /className="money-section"/);
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
  assert.equal((home.match(/key: "(?:calculators|tools|docs|quiz)" as const/g) ?? []).length, 4);
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
  assert.match(platformHome, /EG\.ELC\.ACCS\.ZS/);
  assert.match(platformHome, /neoSnapshot\.objects/);
  assert.doesNotMatch(platformHome, /is-unavailable/);
  assert.doesNotMatch(platformHome, /mockStockSnapshots|mockDisclosure/);
  assert.match(categoryRoute, /category === "about" \? portalContent\[locale\]\.about/);
  assert.match(categoryRoute, /const index = category === "finance" \|\| category === "about" \|\| category === "economy"/);
  assert.match(categoryRoute, /category === "about"\) return <PortalIntroduction locale=\{locale\} \/>/);
  assert.match(site, /publicDataPaths = \["\/world", "\/economy", "\/countries", "\/population", "\/energy", "\/science", "\/papers", "\/about"\]/);
  assert.doesNotMatch(site, /publicDataPaths = \[[^\]]*"\/stocks"/);
});

test("about remains available by URL and in the footer but is omitted from category menus", () => {
  assert.match(platformControls, /categoryNavigation\(locale\)/);
  assert.match(platformSidebar, /categoryNavigation\(locale\)/);
  assert.match(categoryNavigation, /"finance", "stocks", "crypto", "gold", "economy", "science", "world"/);
  assert.doesNotMatch(categoryNavigation, /"commodities"/);
  assert.doesNotMatch(categoryNavigation, /"about"/);
  assert.match(platformLayout, /href=\{`\/\$\{locale\}\/about`\}>\{copy\.categories\[7\]\}/);
  assert.match(categoryRoute, /category === "about" \? portalContent\[locale\]\.about/);
});

test("localized data copy explains missing years without technical interpolation wording", () => {
  const expectedLocales = ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"];
  for (const locale of expectedLocales) {
    const copy = platformCopy[locale];
    assert.ok(copy.overviewBody && copy.latest && copy.previousChange && copy.updated && copy.sourceNote, `${locale}: missing data copy`);
    assert.doesNotMatch(copy.overviewBody, /interpolat|補間|插值|보간/i, `${locale}: technical interpolation wording`);
    assert.doesNotMatch(copy.updated, /snapshot/i, `${locale}: technical snapshot wording`);
    assert.doesNotMatch(copy.sourceNote, /\bAPI\b|\bbatch(?:es)?\b/i, `${locale}: technical collection wording`);
  }
  assert.equal(platformCopy.ko.overviewBody, "World Bank 세계개발지표(WDI)의 국가별 공개 통계를 제공합니다. 데이터가 없는 연도는 임의의 값으로 채우지 않습니다.");
  assert.match(platformCopy.en.overviewBody, /Years without data are not filled with estimated values/);
});

test("theme is initialized once before hydration and uses a narrow root suppression", () => {
  assert.match(layout, /<html[\s\S]*?data-theme="dark" suppressHydrationWarning>/);
  assert.ok(layout.indexOf("<script") < layout.indexOf("{children}"), "theme script must run before page content");
  assert.match(layout, /localStorage\.getItem\('woori-platform-theme'\)/);
  assert.match(layout, /t==='light'\?'light':'dark'/);
  assert.doesNotMatch(platformLayout, /localStorage|document\.documentElement\.dataset\.theme/);
  assert.match(platformControls, /useSyncExternalStore\(subscribeTheme, getTheme, \(\) => "dark"\)/);
  assert.match(platformControls, /document\.documentElement\.dataset\.theme = next/);
  assert.match(platformControls, /localStorage\.setItem\("woori-platform-theme", next\)/);
  assert.match(platformControls, /woori-theme-change/);

  const script = layout.match(/__html: "([^"]+)"/)[1];
  for (const [stored, expected] of [[null, "dark"], ["dark", "dark"], ["light", "light"], ["invalid", "dark"]]) {
    const html = { dataset: {} };
    runInNewContext(script, { document: { documentElement: html }, localStorage: { getItem: () => stored } });
    assert.equal(html.dataset.theme, expected, `stored theme ${stored}`);
  }
  const unavailableStorageHtml = { dataset: {} };
  runInNewContext(script, { document: { documentElement: unavailableStorageHtml }, localStorage: { getItem: () => { throw new Error("blocked"); } } });
  assert.equal(unavailableStorageHtml.dataset.theme, "dark");
});

test("stock markets have translated labels and live data controls in all 26 locales", () => {
  const expectedLocales = ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"];
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
  assert.match(stockPage, /CompanyFundamentalsPanel locale=\{locale\}/);
  assert.doesNotMatch(stockPage, /\/portal-api\/finance\/stocks(?:\/heatmap)?\?/);
  assert.doesNotMatch(stockPage, /search\.get\("market"\)|search\.get\("date"\)/);
  assert.match(categoryRoute, /<Suspense fallback=\{<StockMarketLoading locale=\{locale\} \/>\}>/);
  assert.match(categoryRoute, /const index = category === "finance" \|\| category === "about" \|\| category === "economy"/);
  assert.doesNotMatch(site, /publicDataPaths = \[[^\]]*"\/stocks"/);
});

test("stock date selection never substitutes another market date and distinguishes missing dates", () => {
  assert.deepEqual(snapshotDatesForMarket("us"), []);
  assert.equal(stockSnapshotForDate("us", "2026-10-19"), undefined);
  assert.equal(stockSnapshotForDate("us", "2026-10-18"), undefined);
  assert.equal(classifyStockDate(["2026-10-19"], "2026-10-19", "2026-10-20"), "available");
  assert.equal(classifyStockDate(["2026-10-19"], "2026-10-18", "2026-10-20"), "weekend");
  assert.equal(classifyStockDate(["2026-10-19"], "2026-10-20", "2026-10-20"), "missing");
  assert.equal(classifyStockDate(["2026-10-19"], "2026-10-21", "2026-10-20"), "future");
  assert.equal(classifyStockDate(["2026-10-19"], "2026-13-01", "2026-10-20"), "invalid");
  assert.equal(classifyStockDate([], "2026-10-19", "2026-10-20"), "empty");
  assert.deepEqual(adjacentAvailableDates(["2026-10-21", "2026-10-19", "2026-10-20"], "2026-10-20"), { previous: "2026-10-19", next: "2026-10-21" });
});

test("SEC facts lead the stock page while unapproved price snapshots stay compact and disclosed", () => {
  assert.doesNotMatch(stockPage + worldData + platformHome, /WOORI\.DATA|MARKET SNAPSHOT UI|Market breadth prototype|Snapshot schema preview|Market cap weighted layout|6 mock securities/i);
  assert.doesNotMatch(stockPage, /mockDisclosure|mockLabel|mock-stocks/);
  assert.match(stockPage, /copy\.sourceDisclosure/);
  assert.doesNotMatch(stockPage, /stock-sector-heatmap|stock-market-index-overview|stock-market-movers|stock-market-filter-heading/);
  assert.doesNotMatch(stockPage, /crypto-heatmap stock-market-heatmap/);
  assert.match(stockPage, /stockUnavailableCopy\[locale\]/);
  assert.match(stockPage, /CompanyFundamentalsPanel locale=\{locale\}/);
  assert.ok(stockPage.indexOf("CompanyFundamentalsPanel") < stockPage.indexOf("stock-price-availability"));
  assert.match(companyFactsPanel, /latest: "true"/);
  assert.match(companyFactsPanel, /ticker: selectedTicker/);
  assert.match(companyFactsPanel, /notation: "compact"/);
  assert.match(companyFactsPanel, /company-facts-history-table/);
  assert.match(companyFactsPanel, /dataObservedAt/);
  assert.match(companyFactsPanel, /calculateYearOverYearGrowth\(history, "netIncome"\)/);
  assert.match(platformStyles, /company-facts-summary-grid\{display:grid;grid-template-columns:repeat\(2/);
  assert.match(platformStyles, /@media\(max-width:760px\)/);
  assert.match(platformStyles, /company-facts-summary-grid\{grid-template-columns:1fr\}/);
  for (const locale of ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"]) {
    assert.match(companyFactsPeriods, new RegExp(`(?:^|\\n)\\s*"?${locale}"?: \\{ annual: "[^"]+", quarterly: "[^"]+", annualBasis: "[^"]+", quarterlyBasis: "[^"]+"`), `${locale}: missing company period copy`);
    assert.match(companyFactsStatus, new RegExp(`(?:^|\\n)\\s*"?${locale}"?: \\{ factsLoaded: "[^"]+", netIncomeGrowth: "[^"]+"`), `${locale}: missing SEC freshness and net income growth copy`);
  }
  assert.doesNotMatch(stockPage, /licensedSource\}/);
});

test("shared calendar opens from both controls, uses localized Intl dates, and accepts URL-first values", () => {
  assert.match(datePicker, /aria-haspopup="dialog"/);
  assert.match(datePicker, /new Intl\.DateTimeFormat\(locale/);
  assert.match(datePicker, /ArrowLeft/);
  assert.match(datePicker, /opener\.current\?\.focus\(\)/);
  assert.match(datePicker, /shared-date-picker-today/);
  assert.match(datePickerStyles, /shared-date-picker-trigger>\.shared-date-picker-value\{[^}]*white-space:nowrap/);
  assert.match(datePickerStyles, /shared-date-picker-trigger>\.shared-date-picker-icon\{[^}]*flex:0 0 38px/);
  assert.match(datePickerStyles, /@media\(max-width:600px\)/);
  assert.match(datePickerStyles, /shared-date-picker-trigger>\.shared-date-picker-icon\{flex-basis:42px/);
  assert.match(datePicker, /available\.has\(date\)/);
  assert.match(scienceDateExplorer, /<DatePicker/);
  assert.doesNotMatch(scienceDateExplorer, /type="date"|datalist/i);
  assert.match(scienceDateExplorer, /router\.push\(.*scroll: false/);
  for (const locale of ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"]) {
    assert.match(datePickerCopySource, new RegExp(`(?:^|\\n)\\s*"?${locale}"?: \\{[^\\n]*today: "[^"]+"`), `${locale}: missing localized calendar labels`);
  }
  assert.match(rootProxy, /matcher: "\/"/);
  assert.match(rootProxy, /accept-language/);
  assert.match(rootProxy, /woori-locale/);
  assert.match(rootProxy, /crawler/);
  const order = ["finance", "stocks", "crypto", "gold", "economy", "science", "world"];
  for (const locale of siteData.locales) {
    const entries = getCategoryNavigation(locale);
    assert.deepEqual(entries.slice(0, order.length).map((entry) => entry.id), order);
    assert.ok(entries.every((entry) => entry.label), `${locale}: translated category label`);
    assert.ok(entries[0].label !== entries[1].label, `${locale}: distinct category names`);
  }
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
  assert.match(layout, /url: "\/_assets\/portal\/icon\.png", type: "image\/png"/);
  assert.match(layout, /apple: "\/_assets\/portal\/apple-icon\.png"/);
});

test("portal sitemap contains locale home and privacy pages with matching alternates", () => {
  assert.match(sitemap, /url: `\$\{origin\}\/\$\{locale\}\$\{path\}`/);
  assert.match(sitemap, /publicPaths\.map/);
  assert.match(sitemap, /publicPortalPaths/);
  assert.match(sitemap, /publicDataPaths/);
  assert.match(sitemap, /locales\.flatMap/);
  assert.match(sitemap, /flatMap/);
  assert.match(sitemap, /"\/markets", "\/crypto", "\/gold"/);
  assert.doesNotMatch(sitemap, /"\/commodities"/);
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

test("robots lists live production sitemap endpoints and blocks API crawling", () => {
  for (const path of ["sitemap.xml", "calculator-sitemap.xml", "tools-sitemap.xml", "docs-sitemap.xml", "quiz-sitemap.xml"]) assert.ok(robots.includes(path));
  assert.doesNotMatch(robots, /money-sitemap\.xml/);
  assert.match(robots, /portal-api/);
  assert.match(robots, /allow: "\/"/);
  assert.match(robots, /disallow: \["\/api\/", "\/portal-api\/"\]/);
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
