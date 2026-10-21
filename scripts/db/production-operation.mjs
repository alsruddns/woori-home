import { resolveDatabaseTarget } from "./connection-safety.mjs";

const MAIN_REF = "refs/heads/main";
const SAFE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._/:+-]{2,255}$/;

export function assertProductionOperation({ env = process.env, databaseUrl, backupReference, requireBackup = false } = {}) {
  if (env.DB_TARGET !== "production") throw new Error("Production operation requires DB_TARGET=production.");
  if (env.GITHUB_ACTIONS !== "true" || env.GITHUB_REF !== MAIN_REF) {
    throw new Error("Production database operations are restricted to an approved GitHub Actions run on main.");
  }
  if (!env.PRODUCTION_OPERATION_APPROVAL) throw new Error("The protected production approval secret is unavailable.");
  if (requireBackup) {
    if (!backupReference || !SAFE_REFERENCE.test(backupReference)) throw new Error("A valid production backup reference is required.");
    if (env.PRODUCTION_BACKUP_CONFIRMED !== "true" || env.PRODUCTION_BACKUP_REFERENCE !== backupReference) {
      throw new Error("The production backup must be created and confirmed in this run before writes are allowed.");
    }
  }
  return resolveDatabaseTarget({
    target: "production",
    databaseUrl,
    allowedProductionHosts: env.PRODUCTION_DB_ALLOWED_HOSTS,
  });
}

export function assertDatabaseRolesShareTarget(urls) {
  const parsed = urls.map((value) => {
    if (!value) throw new Error("All required database role URLs must be configured.");
    let url;
    try { url = new URL(value); } catch { throw new Error("A database role URL is invalid."); }
    return {
      host: url.hostname.toLowerCase(),
      port: url.port || "5432",
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    };
  });
  if (parsed.some((item) => item.host !== parsed[0].host || item.port !== parsed[0].port || item.database !== parsed[0].database)) {
    throw new Error("Runtime, import, and migration database roles must target the same approved production database.");
  }
}

export function parseProductionApprovalArgs(args, { requireBackup = false } = {}) {
  const options = { apply: false, dryRun: false, backupReference: undefined };
  for (const arg of args) {
    if (arg === "--apply") { options.apply = true; continue; }
    if (arg === "--dry-run") { options.dryRun = true; continue; }
    if (arg.startsWith("--backup-reference=")) {
      options.backupReference = arg.slice("--backup-reference=".length);
      continue;
    }
    throw new Error(`Unknown production operation option: ${arg.split("=")[0]}`);
  }
  if (options.apply && options.dryRun) throw new Error("Choose either --dry-run or --apply.");
  if (!options.apply && !options.dryRun) throw new Error("Specify --dry-run or --apply explicitly.");
  if (options.apply && requireBackup && !options.backupReference) throw new Error("--apply requires --backup-reference=<verified-backup-id>.");
  if (options.backupReference && !SAFE_REFERENCE.test(options.backupReference)) throw new Error("Backup reference contains unsupported characters.");
  return options;
}

export function requireDistinctDatabaseRoles(urls) {
  const normalized = urls.map((value) => {
    if (!value) throw new Error("All required database role URLs must be configured.");
    const url = new URL(value);
    return `${url.hostname.toLowerCase()}:${url.port || "5432"}${url.pathname}${url.username}`;
  });
  if (new Set(normalized).size !== normalized.length) throw new Error("Runtime, import, and migration database roles must be distinct.");
}
