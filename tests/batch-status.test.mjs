import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordBatchStatus, writeJsonAtomically } from "../scripts/data/batch-status.mjs";
import { fetchWorldBankIndicator } from "../scripts/data/world-bank-adapter.mjs";

test("snapshot writes are atomic and batch status preserves last success after failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "woori-status-"));
  const snapshotPath = join(directory, "snapshot.json");
  try {
    await writeJsonAtomically(snapshotPath, { observations: [{ year: 2025, value: 9 }] });
    const successful = await recordBatchStatus({ snapshotPath, sourceId: "test", datasetId: "dataset", status: "success", referenceDate: "2025", recordCount: 1, attemptedAt: "2026-10-21T00:00:00.000Z" });
    assert.equal(successful.status, "success");
    assert.equal(successful.checksum?.length, 64);
    const failed = await recordBatchStatus({ snapshotPath, sourceId: "test", datasetId: "dataset", status: "failed", error: new Error("upstream HTTP 503"), attemptedAt: "2026-10-22T00:00:00.000Z" });
    assert.equal(failed.status, "failed");
    assert.equal(failed.errorCategory, "upstream-unavailable");
    assert.equal(failed.lastSuccessAt, successful.lastSuccessAt);
    assert.equal(failed.latestReferenceDate, "2025");
    assert.equal(failed.checksum, successful.checksum);
    assert.equal(failed.recordCount, 1);
    assert.deepEqual(JSON.parse(await readFile(snapshotPath, "utf8")), { observations: [{ year: 2025, value: 9 }] });
    assert.equal((await readdir(directory)).some((name) => name.endsWith(".tmp")), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("World Bank adapter retries rate limits, validates provider metadata, and returns normalized observations", async () => {
  const calls = [];
  const payloads = [
    { ok: false, status: 429, headers: { get: () => "1" }, json: async () => null },
    { ok: true, status: 200, headers: { get: () => null }, json: async () => [{ lastupdated: "2026-10-08" }, [{ countryiso3code: "KOR", date: "2024", value: 100, unit: "", country: { value: "Korea, Rep." } }]] },
    { ok: true, status: 200, headers: { get: () => null }, json: async () => [{}, [{ sourceOrganization: "Official statistical source" }]] },
  ];
  const result = await fetchWorldBankIndicator({
    indicator: "SP.POP.TOTL", countries: ["KOR"], startYear: 2024, endYear: 2024,
    fetchImpl: async (url) => { calls.push(url); return payloads.shift(); },
    waitImpl: async () => {},
  });
  assert.equal(calls.length, 3);
  assert.equal(result.observations[0].value, 100);
  assert.equal(result.observations[0].dataProvider, "Official statistical source");
  assert.equal(result.observations[0].lastUpdatedAt, "2026-10-08");
});
