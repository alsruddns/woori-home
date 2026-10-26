import "../db/load-env.mjs";
import pg from "pg";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";
import { collectGoldObservation } from "../../src/lib/data-platform/gold-collection.mjs";
import { createGoldApiProvider } from "../../src/lib/data-platform/gold-price-pipeline.mjs";

// Production registration/secrets and rights are not approved. This entrypoint accepts only local development.
const args = process.argv.slice(2).filter((value) => value !== "--");
if (!args.includes("--target=development") || args.some((value) => !["--target=development", "--apply", "--dry-run"].includes(value))
  || args.includes("--apply") && args.includes("--dry-run")) {
  console.error("Use --target=development [--dry-run | --apply]. Production Gold collection is not enabled.");
  process.exit(2);
}
let pool;
try {
  const target = resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DATABASE_URL });
  pool = new pg.Pool({ connectionString: target.url, max: 1, connectionTimeoutMillis: 4000,
    idleTimeoutMillis: 1000, options: "-c statement_timeout=10000 -c application_name=woori_gold_collection" });
  const client = await pool.connect();
  try { console.log(JSON.stringify(await collectGoldObservation(client, createGoldApiProvider(), { dryRun: !args.includes("--apply") }))); }
  finally { client.release(); }
} catch {
  console.error(JSON.stringify({ status: "blocked-or-failed", message: "Check the local database, reviewed source registration, rights evidence and server credential. No upstream details were logged." }));
  process.exitCode = 1;
} finally { await pool?.end(); }
