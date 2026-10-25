import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { companySearchAliases, normalizeCompanySearch } from "../src/lib/data-platform/company-search-aliases.mjs";

test("company search aliases include Korean names, English names, and symbols", () => {
  assert.ok(companySearchAliases("NVDA").includes("엔비디아"));
  assert.ok(companySearchAliases("NVDA").includes("NVIDIA"));
  assert.equal(normalizeCompanySearch(" 마이크로소프트 "), "마이크로소프트");
  assert.equal(normalizeCompanySearch("Microsoft Corporation"), "microsoftcorporation");
  assert.deepEqual(companySearchAliases("005930"), []);
});

test("crypto name search is local and normalized while dated prices use one dedicated daily API request", async () => {
  const dashboard = await readFile(new URL("../src/app/(locale)/[locale]/crypto-dashboard.tsx", import.meta.url), "utf8");
  const lower = dashboard.toLowerCase();
  assert.match(dashboard, /비트코인/);
  assert.match(dashboard, /이더리움/);
  assert.match(dashboard, /normalize\(value\)/);
  assert.match(dashboard, /asset\.symbol, asset\.name, \.\.\.asset\.aliases/);
  assert.match(dashboard, /fetch\(`\/portal-api\/finance\/crypto\/daily\?market=\$\{market\}`/);
  assert.doesNotMatch(lower, /fetch\([^)]*[?&]q=/);
  assert.match(dashboard, /portal-api\/finance\/crypto\/coinranking/);
  assert.match(dashboard, /change24hPercent/i);
  assert.match(dashboard, /marketCap/i);
  assert.doesNotMatch(lower, /fetch\([^)]*[?&]q=/);
});

test("company aliases only filter the existing SEC company result set", async () => {
  const panel = await readFile(new URL("../src/app/(locale)/[locale]/company-fundamentals-panel.tsx", import.meta.url), "utf8");
  assert.match(panel, /summary\.filter\(\(row\) =>/);
  assert.match(panel, /companySearchAliases\(row\.ticker\)/);
  assert.match(panel, /row\.ticker/);
});

test("Coinranking public routes are PostgreSQL-only and separate the top-20, top-100, and full 300 search set", async () => {
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
  assert.match(dashboard, /visible\.slice\(0, 20\)/);
  assert.match(dashboard, /visible\.slice\(0, 100\)/);
  assert.match(dashboard, /visible\.map\(\(coin\)/);
  assert.match(historyRoute, /daily-observed-aggregate-price/);
});
