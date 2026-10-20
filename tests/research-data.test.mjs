import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectPapers, normalizeCrossrefItems, updatePapers } from "../scripts/data/update-papers.mjs";

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
