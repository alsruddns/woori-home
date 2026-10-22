import test from "node:test";
import assert from "node:assert/strict";
import { negotiateLocale } from "../src/lib/locale-negotiation.mjs";

test("Accept-Language selects the highest-ranked supported locale", () => {
  assert.equal(negotiateLocale("fr-CA,fr;q=0.9,en;q=0.8"), "fr");
  assert.equal(negotiateLocale("es-MX;q=0.7,ko;q=0.9"), "ko");
  assert.equal(negotiateLocale("pt-BR,pt;q=0.8"), "pt-br");
  assert.equal(negotiateLocale("tr-TR,tr;q=0.8,en;q=0.7"), "tr");
});

test("Chinese script and region preferences select the matching supported variant", () => {
  assert.equal(negotiateLocale("zh-TW,zh;q=0.8"), "zh-tw");
  assert.equal(negotiateLocale("zh-Hans-CN,zh;q=0.8"), "zh");
});

test("unsupported browser languages fall back to Korean", () => {
  assert.equal(negotiateLocale("ru-RU,ar;q=0.9"), "ru");
  assert.equal(negotiateLocale("ar,fr;q=0.8"), "fr");
  assert.equal(negotiateLocale("*"), "ko");
});
