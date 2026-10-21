import { assertProductionOperation, requireDistinctDatabaseRoles, assertDatabaseRolesShareTarget } from "./production-operation.mjs";

try {
  if (process.argv.length > 2) throw new Error("No options are supported for production migration status.");
  const urls = [process.env.DATABASE_URL, process.env.DB_IMPORT_URL, process.env.DB_MIGRATION_URL];
  requireDistinctDatabaseRoles(urls);
  assertDatabaseRolesShareTarget(urls);
  const target = assertProductionOperation({ databaseUrl: process.env.DB_MIGRATION_URL });
  process.env.DB_TARGET = "production";
  process.env.DB_MIGRATION_ALLOW_PRODUCTION = "I_HAVE_APPROVAL";
  console.log(`Reading migration status for ${target.database}.`);
  await import("./status.mjs");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Production migration status guard failed.");
  process.exit(1);
}
