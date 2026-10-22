import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
};
const { locales, localeNames } = require("../src/lib/site.ts");
const { familySiteHref, familySiteKeys, familySitesCopy, moneyBookFallbackCopy } = require("../src/lib/family-sites.ts");

test("six family sites and Docs/Quiz copy are complete in all supported locales", () => {
  assert.deepEqual(Object.keys(familySitesCopy), locales);
  assert.deepEqual(familySiteKeys, ["portal", "calculator", "tools", "moneyBook", "docs", "quiz"]);
  assert.deepEqual(Object.values(familySitesCopy.ko.sites), ["포탈", "계산기", "온라인 도구", "무료 공유 가계부", "문서·양식", "퀴즈·테스트"]);
  for (const locale of locales) {
    const copy = familySitesCopy[locale];
    for (const key of familySiteKeys) assert.ok(copy.sites[key], `${locale}/${key}`);
    for (const field of ["docsTitle", "docsDescription", "docsCta", "quizTitle", "quizDescription", "quizCta", "menu"]) assert.ok(copy[field], `${locale}/${field}`);
    assert.ok(localeNames[locale], `${locale} display name`);
  }
});

test("header links preserve locale, indicate active service, and expose a mobile menu", async () => {
  const [source, header, footer, styles] = await Promise.all([
    readFile(new URL("../src/app/(locale)/[locale]/family-site-select.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(locale)/[locale]/portal-header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(locale)/[locale]/portal-footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(source, /familySiteKeys\.map/);
  assert.match(source, /href=\{familySiteHref\(locale, key\)\}/);
  for (const key of familySiteKeys) {
    const segment = { portal: "", calculator: "/calculators", tools: "/tools", moneyBook: "/money", docs: "/docs", quiz: "/quiz" }[key];
    assert.equal(familySiteHref("pt-br", key), key === "moneyBook" ? "/en/money" : `/pt-br${segment}`);
  }
  for (const locale of ["es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr"]) {
    assert.ok(moneyBookFallbackCopy[locale], `${locale} MoneyBook language notice`);
    assert.equal(familySiteHref(locale, "moneyBook"), locale === "zh-tw" ? "/zh/money" : "/en/money");
  }
  for (const locale of ["ko", "en", "ja", "zh"]) assert.equal(familySiteHref(locale, "moneyBook"), `/${locale}/money`);
  assert.match(source, /aria-current=\{active === key \? "page"/);
  assert.match(source, /aria-expanded=\{menuOpen\}/);
  assert.match(source, /setMenuOpen/);
  assert.match(header, /<FamilySiteNav locale=\{locale\} \/>/);
  assert.match(footer, /familySiteKeys\.filter/);
  assert.match(footer, /<ContactDialog locale=\{locale\} \/>/);
  assert.match(styles, /\.family-site-nav\{display:flex/);
  assert.match(styles, /\.mobile-menu-toggle\{display:none/);
  assert.match(styles, /\.family-site-nav\.is-open\{display:grid/);
});
