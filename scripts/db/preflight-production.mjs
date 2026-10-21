import pg from "pg";
import { assertProductionOperation, assertDatabaseRolesShareTarget, requireDistinctDatabaseRoles } from "./production-operation.mjs";

const { Pool } = pg;
const roles = [
  ["runtime", process.env.DATABASE_URL],
  ["import", process.env.DB_IMPORT_URL],
  ["migration", process.env.DB_MIGRATION_URL],
];

try {
  requireDistinctDatabaseRoles(roles.map(([, url]) => url));
  assertDatabaseRolesShareTarget(roles.map(([, url]) => url));
  for (const [, databaseUrl] of roles) assertProductionOperation({ databaseUrl });

  for (const [name, databaseUrl] of roles) {
    const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000, allowExitOnIdle: true });
    try {
      const result = await pool.query("select current_database() as database_name, current_user as role_name");
      const expectedRole = decodeURIComponent(new URL(databaseUrl).username);
      if (result.rows[0]?.database_name !== "woori_today_portal" || result.rows[0]?.role_name.toLowerCase() !== expectedRole.toLowerCase()) {
        throw new Error("Connected identity did not match the validated production target.");
      }
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "connection-check-failed";
      console.error(`PostgreSQL preflight failed for ${name} role (${code}).`);
      process.exitCode = 1;
      break;
    } finally {
      await pool.end();
    }
  }
  if (process.exitCode !== 1) console.log("PostgreSQL preflight passed for runtime, import, and migration roles on woori_today_portal.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Production PostgreSQL preflight was rejected.");
  process.exitCode = 1;
}
