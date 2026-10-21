import "../db/load-env.mjs";
import { assertDatabaseRolesShareTarget, assertProductionOperation, requireDistinctDatabaseRoles } from "../db/production-operation.mjs";

try {
  if (process.argv.length > 2) throw new Error("No options are supported for production World Bank verification.");
  const urls = [process.env.DATABASE_URL, process.env.DB_IMPORT_URL, process.env.DB_MIGRATION_URL];
  requireDistinctDatabaseRoles(urls);
  assertDatabaseRolesShareTarget(urls);
  assertProductionOperation({ databaseUrl: process.env.DATABASE_URL });
  process.env.DB_TARGET = "production";
  process.env.DB_MIGRATION_ALLOW_PRODUCTION = "I_HAVE_APPROVAL";
  process.env.WORLD_BANK_VERIFY_TARGET = "production";
  await import("./verify-world-bank.mjs");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Production World Bank verification guard failed.");
  process.exit(1);
}
