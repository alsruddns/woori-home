import { parseProductionApprovalArgs, assertProductionOperation, requireDistinctDatabaseRoles, assertDatabaseRolesShareTarget } from "./production-operation.mjs";

let options;
try {
  options = parseProductionApprovalArgs(process.argv.slice(2), { requireBackup: true });
  if (options.dryRun) {
    const target = assertProductionOperation({ databaseUrl: process.env.DB_MIGRATION_URL, requireBackup: false });
    console.log(`Dry run accepted for ${target.database} at the approved production host; no database connection was opened.`);
    process.exit(0);
  }
  const backupReference = options.backupReference;
  const urls = [process.env.DATABASE_URL, process.env.DB_IMPORT_URL, process.env.DB_MIGRATION_URL];
  requireDistinctDatabaseRoles(urls);
  assertDatabaseRolesShareTarget(urls);
  const target = assertProductionOperation({ databaseUrl: process.env.DB_MIGRATION_URL, backupReference, requireBackup: true });
  process.env.DB_TARGET = "production";
  process.env.DB_MIGRATION_ALLOW_PRODUCTION = "I_HAVE_APPROVAL";
  console.log(`Applying pending Drizzle migrations to ${target.database}; backup reference verified.`);
  await import("./migrate.mjs");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Production migration guard failed.");
  process.exit(1);
}
