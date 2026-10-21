import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectPapers, normalizeCrossrefItems, updatePapers } from "../scripts/data/update-papers.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  const ts = require("typescript");
  const source = require("node:fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  module._compile(output, filename);
};
const { filterResearchPapers, validPaperDate } = require("../src/lib/data-platform/research-search.ts");

const sample = {
  DOI: "10.1234/example.2026.01",
  title: ["A verified sample title"],
  author: [{ given: "Ada", family: "Lovelace" }],
  published: { "date-parts": [[2026, 10, 20]] },
  indexed: { "date-parts": [[2026, 10, 21]] },
  "container-title": ["Example Journal"],
  type: "journal-article",
  URL: "https://doi.org/10.1234/example.2026.01",
  "is-referenced-by-count": 8,
  license: [{ URL: "https://creativecommons.org/licenses/by/4.0/" }],
  abstract: "Must not be retained",
};

test("Crossref normalizer keeps bibliographic facts only and deduplicates topic hits", async () => {
  const normalized = normalizeCrossrefItems([sample], "ai");
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].doi, sample.DOI);
  assert.equal(normalized[0].citationCount, 8);
  assert.ok(!("abstract" in normalized[0]));
  const snapshot = await collectPapers({ now: new Date("2026-10-21T00:00:00Z"), fixture: { message: { items: [sample] } } });
  assert.equal(snapshot.records.length, 1);
  assert.ok(!JSON.stringify(snapshot).includes("Must not be retained"));
});

test("daily Crossref refresh is idempotent and preserves the last valid file on upstream failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "woori-papers-"));
  const output = join(directory, "papers.json");
  try {
    const fixture = { message: { items: [sample] } };
    const options = { output, now: new Date("2026-10-21T00:00:00Z"), fixture };
    const first = await updatePapers(options);
    const initial = await readFile(output, "utf8");
    const second = await updatePapers({ ...options, now: new Date("2026-10-22T00:00:00Z") });
    assert.equal(first.changed, true);
    assert.equal(second.changed, false);
    assert.equal(await readFile(output, "utf8"), initial);
    await assert.rejects(updatePapers({ output, fetchImpl: async () => ({ ok: false, status: 400, headers: new Headers() }) }), /HTTP 400/);
    assert.equal(await readFile(output, "utf8"), initial);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Crossref refresh retains still-recent records when API search results fluctuate", async () => {
  const directory = await mkdtemp(join(tmpdir(), "woori-papers-window-"));
  const output = join(directory, "papers.json");
  const second = { ...sample, DOI: "10.1234/second.2026", title: ["A second verified sample title"] };
  try {
    const first = await updatePapers({ output, now: new Date("2026-10-21T00:00:00Z"), fixture: { message: { items: [sample, second] } } });
    const firstFile = await readFile(output, "utf8");
    const next = await updatePapers({ output, now: new Date("2026-10-21T12:00:00Z"), fixture: { message: { items: [sample] } }, forceRefresh: true });
    assert.equal(first.changed, true);
    assert.equal(next.changed, false);
    assert.equal(next.snapshot.records.length, 2);
    assert.equal(await readFile(output, "utf8"), firstFile);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Crossref updater performs at most one successful fetch per UTC day unless explicitly forced", async () => {
  const directory = await mkdtemp(join(tmpdir(), "woori-papers-daily-"));
  const output = join(directory, "papers.json");
  try {
    const now = new Date("2026-10-21T04:00:00Z");
    const first = await updatePapers({ output, now, fixture: { message: { items: [sample] } } });
    const second = await updatePapers({ output, now: new Date("2026-10-21T18:00:00Z"), fixture: () => { throw new Error("same-day refetch should be skipped"); } });
    assert.equal(first.changed, true);
    assert.equal(second.changed, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("paper search filters locale query and exact publication dates, excludes retracted work, and sorts by citations", () => {
  const papers = [
    { id: "a", topic: "ai", title: "Graph models for climate", doi: "10.1/a", journal: null, authors: ["Ada Lovelace"], publishedAt: "2026-10-10", indexedAt: "2026-10-11", citationCount: 2, retracted: false },
    { id: "b", topic: "energy", title: "Grid storage", doi: "10.1/b", journal: "Energy Review", authors: ["Grace Hopper"], publishedAt: "2026-10-15", indexedAt: "2026-10-16", citationCount: 9, retracted: false },
    { id: "c", topic: "energy", title: "Grid storage withdrawn", doi: "10.1/c", journal: null, authors: ["Grace Hopper"], publishedAt: "2026-10-15", indexedAt: "2026-10-17", citationCount: 50, retracted: true },
  ];
  assert.equal(validPaperDate("2026-02-30"), "");
  assert.equal(validPaperDate("2026-02-28"), "2026-02-28");
  const byDoi = filterResearchPapers(papers, { topic: "all", sort: "recent", query: "10.1/B", locale: "en" });
  assert.deepEqual(byDoi.records.map((paper) => paper.id), ["b"]);
  const byWindow = filterResearchPapers(papers, { topic: "energy", sort: "citations", from: "2026-10-15", to: "2026-10-15", locale: "en" });
  assert.deepEqual(byWindow.records.map((paper) => paper.id), ["b"]);
  const clamped = filterResearchPapers(papers, { topic: "all", sort: "recent", query: `  ${"x".repeat(125)}  `, from: "2026-02-30", locale: "en" });
  assert.equal(clamped.query.length, 120);
  assert.equal(clamped.from, "");
});
