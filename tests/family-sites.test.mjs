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
const { locales } = require("../src/lib/site.ts");
const { familySitesCopy } = require("../src/lib/family-sites.ts");

test("portal family sites have localized names, correct Korean labels, and all 15 locales", () => {
  assert.equal(Object.keys(familySitesCopy).length, 15);
  assert.deepEqual(Object.keys(familySitesCopy), locales);
  assert.deepEqual(
    [familySitesCopy.ko.label, familySitesCopy.ko.portal, familySitesCopy.ko.calculator, familySitesCopy.ko.tools, familySitesCopy.ko.moneyBook],
    ["패밀리사이트", "포탈", "계산기", "온라인 도구", "무료 공유 가계부"],
  );
  for (const locale of locales) {
    for (const field of ["label", "portal", "calculator", "tools", "moneyBook", "newTab"]) assert.ok(familySitesCopy[locale][field], locale + "/" + field);
  }
});

test("portal family selector keeps locale, service order, current state, and secure new-tab navigation", async () => {
  const source = await readFile(new URL("../src/app/(locale)/[locale]/family-site-select.tsx", import.meta.url), "utf8");
  assert.match(source, /portal:.*calculators:.*tools:.*money:/);
  assert.match(source, /value="portal"/);
  assert.match(source, /window\.open\(target, "_blank", "noopener,noreferrer"\)/);
  assert.match(source, /aria-describedby="family-site-new-tab"/);
});
