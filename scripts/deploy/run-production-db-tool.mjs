import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parseDatabaseRoleEnv } from "./database-env.mjs";

const ALLOWED_TOOLS = new Set([
  "scripts/db/preflight-production.mjs",
  "scripts/db/preflight-financial-production.mjs",
  "scripts/db/status-production.mjs",
  "scripts/db/migrate-production.mjs",
  "scripts/db/grant-financial-runtime-read-production.mjs",
  "scripts/db/grant-financial-import-production.mjs",
  "scripts/db/grant-coinranking-import-production.mjs",
  "scripts/data/coinranking-daily-collection.mjs",
  "scripts/data/import-world-bank-production.mjs",
  "scripts/data/verify-world-bank-production.mjs",
  "scripts/data/financial-sec-production.mjs",
  "scripts/data/import-sec-company-facts-production.mjs",
]);

const [envPath, tool, ...args] = process.argv.slice(2);
if (!envPath || !ALLOWED_TOOLS.has(tool)) {
  console.error("A mounted portal env file and an allowlisted production DB command are required.");
  process.exit(2);
}

try {
  const content = await readFile(envPath, "utf8");
  const roleEnv = parseDatabaseRoleEnv(content);
  const approvalPath = process.env.PRODUCTION_OPERATION_APPROVAL_FILE;
  if (!approvalPath) throw new Error("A mounted production approval file is required.");
  const approval = (await readFile(approvalPath, "utf8")).trim();
  if (!approval) throw new Error("The mounted production approval file is empty.");
  const child = spawnSync(process.execPath, [resolve(process.cwd(), tool), ...args], {
    env: {
      ...process.env,
      ...roleEnv,
      PRODUCTION_OPERATION_APPROVAL: approval,
    },
    stdio: "inherit",
    windowsHide: true,
  });
  if (child.error) throw new Error("Could not start the guarded production DB command.");
  process.exitCode = child.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not prepare the guarded production DB command.");
  process.exitCode = 1;
}
