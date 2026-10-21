import "../db/load-env.mjs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { assertProductionOperation, parseProductionApprovalArgs } from "../db/production-operation.mjs";
import { IMPORTABLE_INDICATORS, normalizeWorldBankSnapshot } from "./world-bank-import-core.mjs";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
try {
  const options = parseProductionApprovalArgs(process.argv.slice(2), { requireBackup: true });
  const bytes = await readFile(resolve(root, "src/data/world-bank.json"));
  const snapshot = JSON.parse(bytes.toString("utf8"));
  const normalized = normalizeWorldBankSnapshot(snapshot);
  const approvedCodes = Object.keys(IMPORTABLE_INDICATORS).sort();
  const actualCodes = [...new Set(normalized.observations.map((row) => row.indicator))].sort();
  if (actualCodes.some((code) => !approvedCodes.includes(code))) throw new Error("Snapshot normalization included an indicator outside the reviewed import allowlist.");

  if (options.dryRun) {
    const target = assertProductionOperation({ databaseUrl: process.env.DB_IMPORT_URL });
    console.log(`Dry run: ${normalized.observations.length} reviewed observations for ${actualCodes.join(", ")} validated; target ${target.database}; no database connection was opened.`);
    console.log(`Snapshot SHA-256: ${createHash("sha256").update(bytes).digest("hex")}; missing: ${normalized.missing}; duplicate source rows: ${normalized.duplicates}.`);
    process.exit(0);
  }

  assertProductionOperation({ databaseUrl: process.env.DB_IMPORT_URL, backupReference: options.backupReference, requireBackup: true });
  process.env.DB_TARGET = "production";
  process.env.DB_MIGRATION_ALLOW_PRODUCTION = "I_HAVE_APPROVAL";
  process.env.WORLD_BANK_IMPORT_TARGET = "production";
  process.env.PRODUCTION_BACKUP_REFERENCE = options.backupReference;
  process.env.PRODUCTION_BACKUP_CONFIRMED = "true";
  process.argv = [process.argv[0], fileURLToPath(new URL("./import-world-bank.mjs", import.meta.url))];
  await import("./import-world-bank.mjs");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Production World Bank import guard failed.");
  process.exit(1);
}
