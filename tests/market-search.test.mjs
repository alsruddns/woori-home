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

test("crypto name search is local, case-insensitive, whitespace-normalized, and not price data", async () => {
  const dashboard = await readFile(new URL("../src/app/(locale)/[locale]/crypto-dashboard.tsx", import.meta.url), "utf8");
  const lower = dashboard.toLowerCase();
  assert.match(dashboard, /비트코인/);
  assert.match(dashboard, /이더리움/);
  assert.match(dashboard, /normalize\(value\)/);
  assert.match(dashboard, /asset\.symbol, asset\.name, \.\.\.asset\.aliases/);
  assert.doesNotMatch(lower, /fetch\(/);
  assert.doesNotMatch(lower, /currentquote|change24hpercent|marketcap/);
});

test("company aliases only filter the existing SEC company result set", async () => {
  const panel = await readFile(new URL("../src/app/(locale)/[locale]/company-fundamentals-panel.tsx", import.meta.url), "utf8");
  assert.match(panel, /summary\.filter\(\(row\) =>/);
  assert.match(panel, /companySearchAliases\(row\.ticker\)/);
  assert.match(panel, /row\.ticker/);
});
