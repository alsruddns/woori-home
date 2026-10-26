import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const shaPattern = /^[a-f0-9]{64}$/;
const reviewedSpecialCases = new Map([
  ["0012_coinranking_asset_identity", "replace-natural-key-index-and-seed-disabled-pending-provider"],
  ["0013_coinranking_snapshot_rights", "add-pending-rights-metadata-only"],
]);

export function isAdditiveSchemaOnlySql(sql) {
  if (typeof sql !== "string" || !sql.trim()) return false;
  const withoutComments = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
  const statements = withoutComments.split(";").map((statement) => statement.trim()).filter(Boolean);
  if (!statements.length) return false;
  return statements.every((statement) =>
    /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w".]+\s+ON\s+/i.test(statement)
    || /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w".]+\s*\(/i.test(statement)
    || /^ALTER\s+TABLE\s+[\w".]+\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w".]+\s+(?!.*\b(?:NOT\s+NULL|DEFAULT|GENERATED|REFERENCES|CHECK)\b)[\w(]/i.test(statement)
    || /^CREATE\s+TYPE\s+[\w".]+\s+AS\s+ENUM\s*\(/i.test(statement)
  );
}

export function evaluateAutomaticMigrations({ report, journal, manifest, sqlByTag }) {
  const reasons = [];
  const migrationState = report?.migrations;
  const entries = journal?.entries;
  const allowlist = manifest?.migrations;
  if (manifest?.version !== 1 || !Array.isArray(allowlist)) reasons.push("The automatic migration allowlist is invalid.");
  if (!migrationState || migrationState.prefixIsValid !== true || !Array.isArray(migrationState.pending) || !Array.isArray(entries)) {
    reasons.push("The production migration history is not a verified journal prefix.");
  }
  if ((report?.blockers?.length ?? 0) > 0) reasons.push("The production database preflight reported blockers.");
  if ((report?.permissionFindings?.length ?? 0) > 0) reasons.push("Production database role grants require a separately reviewed operation.");
  if (reasons.length) return { allowed: false, apply: false, pending: migrationState?.pending ?? [], reasons };

  const expectedPending = entries.slice(migrationState.applied).map((entry) => entry.tag);
  if (JSON.stringify(expectedPending) !== JSON.stringify(migrationState.pending)) {
    reasons.push("The reported pending migrations do not match the checked-in journal suffix.");
  }
  if (expectedPending.length > 2) reasons.push("More than two pending migrations require a separately reviewed operation.");
  const coinrankingMigrationPending = expectedPending.some((tag) => reviewedSpecialCases.has(tag));
  if (coinrankingMigrationPending) {
    const coinranking = report.coinranking;
    const counts = coinranking?.counts;
    const secRows = report.secIdentityDiagnostic?.rows;
    const xomRows = Array.isArray(secRows) ? secRows.filter((row) => row.ticker === "XOM") : [];
    const issuer = xomRows[0];
    const oldIndexPresent = report.indexes?.some((index) => index.indexname === "financial_assets_natural_key_unique_idx");
    const newIndexPresent = report.indexes?.some((index) => index.indexname === "financial_assets_natural_key_idx");
    if (!counts || counts.assets !== 0 || counts.active_assets !== 0 || counts.daily_snapshots !== 0 || counts.duplicate_keys !== 0) {
      reasons.push("Coinranking identity/rights migrations require zero existing Coinranking assets, active assets, snapshots, and duplicate keys.");
    }
    if (expectedPending.includes("0012_coinranking_asset_identity")) {
      if (!coinranking || coinranking.source !== null || coinranking.datasetPresent !== false) reasons.push("Coinranking identity migration requires the source and dataset seed rows to be absent before migration.");
    } else if (expectedPending.includes("0013_coinranking_snapshot_rights")) {
      const rights = coinranking?.source?.financial_rights;
      const pendingRights = rights && [rights.apiAccess, rights.publicDisplay, rights.dbStorage, rights.longTermRetention, rights.userApi, rights.derivedVisualization, rights.dailySnapshot, rights.adSupportedDisplay, rights.competitorPermission].every((value) => value === "pending");
      if (!coinranking?.source || coinranking.datasetPresent !== true || coinranking.source.collection_enabled !== false || !pendingRights || rights.csvRedistribution !== "denied") {
        reasons.push("Coinranking rights migration may only extend the existing disabled source while all public/storage rights remain pending.");
      }
    }
    if (!Array.isArray(secRows) || xomRows.length !== 1 || issuer?.cik !== "0000034088" || new Set(secRows.map((row) => row.cik)).size !== secRows.length) {
      reasons.push("The SEC XOM identity diagnostic must contain one parent CIK 0000034088 ticker row and no duplicate CIKs.");
    }
    if (expectedPending.includes("0012_coinranking_asset_identity") && (!oldIndexPresent || newIndexPresent)) {
      reasons.push("The Coinranking identity migration requires the expected old natural-key index and no preexisting replacement index.");
    }
  }
  for (const tag of expectedPending) {
    const policy = allowlist.find((entry) => entry?.tag === tag);
    const sql = sqlByTag?.[tag];
    const digest = typeof sql === "string" ? createHash("sha256").update(sql).digest("hex") : "";
    const expectedSpecialCase = reviewedSpecialCases.get(tag);
    const reviewedException = expectedSpecialCase && policy?.specialCase === expectedSpecialCase;
    if (!policy || policy.sha256 !== digest || !shaPattern.test(policy.sha256 ?? "") || policy.dataLossRisk !== "none" || policy.restoreTestRequired !== true || !(policy.schemaOnly === true || reviewedException)) {
      reasons.push(`${tag} is not explicitly allowlisted by its exact migration checksum and reviewed safety metadata.`);
      continue;
    }
    if (!reviewedException && !isAdditiveSchemaOnlySql(sql)) {
      reasons.push(`${tag} contains SQL outside the automatic additive-schema allowlist.`);
    }
  }

  return { allowed: reasons.length === 0, apply: expectedPending.length > 0 && reasons.length === 0, pending: expectedPending, reasons };
}

async function run() {
  const reportPath = process.argv[2];
  if (!reportPath || process.argv.length !== 3) throw new Error("Usage: automatic-migration-policy.mjs <read-only-preflight-json>");
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const journal = JSON.parse(await readFile(path.join(root, "drizzle/meta/_journal.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(root, "scripts/deploy/automatic-migration-policy.json"), "utf8"));
  const sqlByTag = {};
  for (const entry of journal.entries) sqlByTag[entry.tag] = await readFile(path.join(root, "drizzle", `${entry.tag}.sql`), "utf8");
  const result = evaluateAutomaticMigrations({ report, journal, manifest, sqlByTag });
  console.log(JSON.stringify(result));
  if (!result.allowed) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : "Automatic migration policy failed closed.");
    process.exitCode = 1;
  });
}
