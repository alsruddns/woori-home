import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { companySearchAliases, normalizeCompanySearch } from "../src/lib/data-platform/company-search-aliases.mjs";

test("company search aliases include English names and preserve numeric symbol lookup", () => {
  assert.ok(companySearchAliases("NVDA").includes("NVIDIA"));
  assert.equal(normalizeCompanySearch("Microsoft Corporation"), "microsoftcorporation");
  assert.deepEqual(companySearchAliases("005930"), []);
});

test("crypto search, UTC date selection and chart history use the rights-gated Alternative snapshot API", async () => {
  const [dashboard, route] = await Promise.all([
    readFile(new URL("../src/app/(locale)/[locale]/crypto-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/portal-api/finance/crypto/alternative/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /normalize\(value\)/);
  assert.match(dashboard, /coin\.name, coin\.symbol, \.\.\.coin\.aliases/);
  assert.match(dashboard, /useSearchParams/);
  assert.match(dashboard, /portal-api\/finance\/crypto\/alternative\?date=/);
  assert.match(dashboard, /portal-api\/finance\/crypto\/alternative\?asset=/);
  assert.match(dashboard, /coins\.slice\(0, 100\)/);
  assert.match(dashboard, /queryDate/);
  assert.match(dashboard, /labels\.changeMeaning/);
  assert.doesNotMatch(dashboard, /portal-api\/finance\/crypto\/coinranking/);
  assert.match(route, /readOpenPriceMarket\(getFinancialReadOnlyPool\(\),'crypto'/);
  assert.match(route, /invalid-date/);
  assert.match(route, /'all':3650/);
  assert.doesNotMatch(route, /COINRANKING_API_KEY|fetch\(/);
});

test("company aliases only filter the existing SEC company result set", async () => {
  const panel = await readFile(new URL("../src/app/(locale)/[locale]/company-fundamentals-panel.tsx", import.meta.url), "utf8");
  assert.match(panel, /summary\.filter\(\(row\) =>/);
  assert.match(panel, /companySearchAliases\(row\.ticker\)/);
  assert.match(panel, /row\.ticker/);
});

test("Coinranking public routes remain PostgreSQL-only and rights-gated", async () => {
  const [marketRoute, historyRoute, queries, dashboard] = await Promise.all([
    readFile(new URL("../src/app/portal-api/finance/crypto/coinranking/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/portal-api/finance/crypto/coinranking/[uuid]/history/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/db/financial-queries.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(locale)/[locale]/crypto-dashboard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(marketRoute, /getCoinrankingDailyMarket/);
  assert.match(historyRoute, /getCoinrankingDailyHistory/);
  assert.doesNotMatch(`${marketRoute}\n${historyRoute}`, /createCoinrankingProvider|COINRANKING_API_KEY|fetch\(/);
  assert.match(queries, /competitorPermission/);
  assert.match(queries, /dailySnapshot/);
  assert.match(queries, /longTermRetention/);
  assert.doesNotMatch(dashboard, /portal-api\/finance\/crypto\/coinranking/);
  assert.match(historyRoute, /daily-observed-aggregate-price/);
});

test("Portal market home uses persisted price data and exposes only supported indexable overview paths", async () => {
  const [summary, home, markets, stocksCategory, sitemap, cryptoCopy] = await Promise.all([
    readFile(new URL("../src/app/(locale)/[locale]/market-snapshot.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(locale)/[locale]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(locale)/[locale]/(platform)/markets/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(locale)/[locale]/(platform)/[category]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/data-platform/crypto-page-copy.ts", import.meta.url), "utf8"),
  ]);
  assert.match(summary, /readOpenPriceMarket\(pool, "crypto"\)/);
  assert.match(summary, /readOpenPriceMarket\(pool, "gold"\)/);
  assert.match(summary, /Alternative\.me/);
  assert.match(summary, /World Bank Pink Sheet/);
  assert.match(home, /force-dynamic/);
  const platformHome = await readFile(new URL("../src/app/(locale)/[locale]/platform-home.tsx", import.meta.url), "utf8");
  assert.match(platformHome, /MarketSnapshot locale=\{locale\}/);
  assert.match(markets, /robots: \{ index: true, follow: true \}/);
  assert.match(stocksCategory, /category === "stocks"/);
  assert.match(sitemap, /"\/markets", "\/stocks", "\/crypto", "\/gold"/);
  assert.match(cryptoCopy, /not finalized exchange closes/);
});
