import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const componentPath = new URL("../src/app/(locale)/[locale]/portal-education-cards.tsx", import.meta.url);
const cssPath = new URL("../src/app/(locale)/[locale]/platform.css", import.meta.url);
const nextConfigPath = new URL("../next.config.ts", import.meta.url);
const topics = ["markets", "stocks", "crypto", "gold", "commodities", "world", "science", "insights", "population", "comparison", "energy", "papers"];

test("every Portal category has separate Korean and English explainer cards with official references", async () => {
  const source = await readFile(componentPath, "utf8");
  const ko = source.slice(source.indexOf("  ko: {"), source.indexOf("  en: {"));
  const en = source.slice(source.indexOf("  en: {"), source.indexOf("\n};\n\nexport function PortalEducationCards"));
  for (const topic of topics) {
    assert.match(ko, new RegExp(`\\n    ${topic}: \\{ title: ".+?", cards: \\[`), `Korean ${topic} entry`);
    assert.match(en, new RegExp(`\\n    ${topic}: \\{ title: ".+?", cards: \\[`), `English ${topic} entry`);
  }
  assert.equal((ko.match(/\{ title: ".+?", paragraphs: \[/g) ?? []).length, topics.length * 3);
  assert.equal((en.match(/\{ title: ".+?", paragraphs: \[/g) ?? []).length, topics.length * 3);
  assert.match(source, /sources\.map\(\(source\) => <li key=\{source\.href\}><a href=\{source\.href\}/);
});

test("explainers are rendered as ordinary visible HTML, with no collapsed disclosure controls", async () => {
  const [source, css] = await Promise.all([readFile(componentPath, "utf8"), readFile(cssPath, "utf8")]);
  assert.match(source, /return <section className="portal-education"/);
  assert.match(source, /<article className="portal-education-card"/);
  assert.doesNotMatch(source, /<(?:details|summary)\b|aria-expanded|<button/);
  assert.match(css, /\.portal-education-card\{[^}]*border:/);
  assert.match(css, /@media\(max-width:680px\)\{\.portal-education-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.doesNotMatch(css, /\.portal-education[^}]*display:\s*none/);
});

test("local Playwright loopback access is explicitly allowed by the Next.js development server", async () => {
  const config = await readFile(nextConfigPath, "utf8");
  assert.match(config, /allowedDevOrigins:\s*\["127\.0\.0\.1"\]/);
});

test("new prose is not represented as a reviewed translation in other locales", async () => {
  const source = await readFile(componentPath, "utf8");
  assert.match(source, /if \(locale !== "ko" && locale !== "en"\) return null;/);
});
