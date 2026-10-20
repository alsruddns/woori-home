import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export async function writeJsonAtomically(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value)}\n`, "utf8");
    await rename(temporary, path);
  } catch (error) {
    await import("node:fs/promises").then(({ unlink }) => unlink(temporary).catch(() => {}));
    throw error;
  }
}

export async function recordBatchStatus({ snapshotPath, sourceId, datasetId, status, referenceDate = null, recordCount = null, error = null, attemptedAt = new Date().toISOString() }) {
  const statusPath = resolve(dirname(snapshotPath), `${snapshotPath.split(/[\\/]/).at(-1).replace(/\.json$/, "")}.status.json`);
  const previous = await readFile(statusPath, "utf8").then(JSON.parse).catch(() => null);
  const snapshotText = await readFile(snapshotPath, "utf8").catch(() => null);
  const checksum = snapshotText ? createHash("sha256").update(snapshotText).digest("hex") : previous?.checksum ?? null;
  const snapshot = snapshotText ? JSON.parse(snapshotText) : null;
  const snapshotRows = snapshot?.records ?? snapshot?.observations ?? snapshot?.objects ?? [];
  const inferredReference = (snapshot?.endDate ?? snapshot?.generatedAt?.slice?.(0, 10) ?? snapshotRows.reduce((latest, row) => {
    const date = row.indexedAt ?? row.year?.toString?.() ?? row.closeApproachDate ?? "";
    return date > latest ? date : latest;
  }, "")) || null;
  const succeeded = status === "success" || status === "unchanged";
  const next = {
    schemaVersion: 1,
    sourceId,
    datasetId,
    lastAttemptAt: attemptedAt,
    lastSuccessAt: succeeded ? attemptedAt : previous?.lastSuccessAt ?? snapshot?.fetchedAt ?? snapshot?.generatedAt ?? null,
    latestReferenceDate: referenceDate ?? previous?.latestReferenceDate ?? inferredReference,
    snapshotVersion: checksum ? checksum.slice(0, 16) : previous?.snapshotVersion ?? null,
    checksum,
    recordCount: recordCount ?? (succeeded ? snapshotRows.length : previous?.recordCount ?? snapshotRows.length),
    status,
    errorCategory: error ? (/validation|schema|invalid|incomplete|too few|no validated|inconsistent/i.test(String(error)) ? "validation" : /http|fetch|timeout|network|rate/i.test(String(error)) ? "upstream-unavailable" : "unknown") : null,
  };
  await writeJsonAtomically(statusPath, next);
  return next;
}
