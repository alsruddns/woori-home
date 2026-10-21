import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordBatchStatus, writeJsonAtomically } from "./batch-status.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const snapshotPath = resolve(root, "src/data/research-papers.json");
const translationsPath = resolve(root, "src/data/paper-title-localizations.json");
const locales = ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi"];

export async function applyPaperTitleLocalizations({ now = new Date() } = {}) {
  const [snapshot, translations] = await Promise.all([
    readFile(snapshotPath, "utf8").then(JSON.parse),
    readFile(translationsPath, "utf8").then(JSON.parse),
  ]);
  const localized = snapshot.records.map((record) => {
    const curated = translations[record.doi.toLowerCase()] ?? {};
    const localizedTitles = { ...(record.localizedTitles ?? {}), ...curated };
    const validCount = locales.filter((locale) => typeof localizedTitles[locale] === "string" && localizedTitles[locale].trim()).length;
    if (Object.keys(curated).some((locale) => !locales.includes(locale)) || Object.values(curated).some((title) => typeof title !== "string" || !title.trim())) {
      throw new Error(`Invalid localized title data for ${record.doi}`);
    }
    return {
      ...record,
      originalTitle: record.originalTitle ?? record.title,
      originalLanguage: record.originalLanguage ?? "und",
      localizedTitles,
      translationStatus: validCount === locales.length ? "draft" : "pending",
      translationMethod: validCount > 0 ? "development-draft" : "pending",
      translationUpdatedAt: validCount > 0 ? record.translationUpdatedAt ?? now.toISOString().slice(0, 10) : null,
    };
  });
  const next = { ...snapshot, records: localized };
  if (JSON.stringify(snapshot) === JSON.stringify(next)) return { changed: false, translatedRecords: localized.filter((record) => Object.keys(record.localizedTitles ?? {}).length).length };
  await writeJsonAtomically(snapshotPath, next);
  const statusPath = resolve(root, "src/data/research-papers.status.json");
  const previousStatus = await readFile(statusPath, "utf8").then(JSON.parse).catch(() => null);
  if (previousStatus) await recordBatchStatus({ snapshotPath, sourceId: "crossref", datasetId: "recent-research-papers", status: "unchanged", referenceDate: previousStatus.latestReferenceDate, recordCount: next.records.length, attemptedAt: previousStatus.lastAttemptAt });
  return { changed: true, translatedRecords: localized.filter((record) => Object.keys(record.localizedTitles ?? {}).length).length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await applyPaperTitleLocalizations();
  console.log(`Paper title localization ${result.changed ? "updated" : "unchanged"}; ${result.translatedRecords} records have localized title data.`);
}
