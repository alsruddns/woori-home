import {
  assertDatabaseRolesShareTarget,
  assertProductionOperation,
  requireDistinctDatabaseRoles,
} from "./production-operation.mjs";

export const PRODUCTION_ROLE_KEYS = ["DATABASE_URL", "DB_IMPORT_URL", "DB_MIGRATION_URL"];
export const PRODUCTION_ROLE_NAMES = {
  DATABASE_URL: "woori_portal",
  DB_IMPORT_URL: "woori_portal_import",
  DB_MIGRATION_URL: "woori_portal_migration",
};

export function validateFinancialProductionContext({ env = process.env, requireBackup = false, backupReference } = {}) {
  const urls = PRODUCTION_ROLE_KEYS.map((key) => env[key]);
  requireDistinctDatabaseRoles(urls);
  assertDatabaseRolesShareTarget(urls);
  const targets = Object.fromEntries(PRODUCTION_ROLE_KEYS.map((key) => [key, assertProductionOperation({
    env,
    databaseUrl: env[key],
    backupReference: key === "DB_IMPORT_URL" ? backupReference : undefined,
    requireBackup: requireBackup && key === "DB_IMPORT_URL",
  })]));
  for (const key of PRODUCTION_ROLE_KEYS) {
    const username = decodeURIComponent(new URL(env[key]).username);
    if (username !== PRODUCTION_ROLE_NAMES[key]) {
      throw new Error(`${key} must use the provisioned ${PRODUCTION_ROLE_NAMES[key]} role.`);
    }
  }
  return targets;
}

export function safeDatabaseErrorCode(error) {
  return error && typeof error === "object" && typeof error.code === "string"
    ? error.code
    : "database-operation-failed";
}

export function quotePgIdentifier(identifier) {
  if (typeof identifier !== "string" || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error("Database role identifier is invalid.");
  }
  return `"${identifier.replaceAll('"', '""')}"`;
}
