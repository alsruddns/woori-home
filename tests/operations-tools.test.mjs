import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("SEC production diagnostics remain read-only and expose collection metrics", async () => {
  const source = await readFile(new URL("../scripts/data/financial-sec-production.mjs", import.meta.url), "utf8");
  assert.match(source, /default_transaction_read_only=on/);
  assert.match(source, /from data_collection_runs where dataset_id=\$1/);
  assert.match(source, /finished_at,status,scope,record_count/);
  for (const key of ["apiRequests", "apiRetries", "rateLimitResponses", "requestFailures", "latestFiledDate", "latestFinancialPeriod"]) assert.match(source, new RegExp(key));
  assert.doesNotMatch(source, /\b(?:insert into|update |delete from|create table|grant )/i);
});

test("VPS inventory tool is read-only and retains backup and Docker state", async () => {
  const source = await readFile(new URL("../scripts/ops/disk-report.mjs", import.meta.url), "utf8");
  assert.match(source, /docker.*system.*df/);
  assert.match(source, /docker.*volume.*ls/);
  assert.match(source, /\/opt\/backups\/woori-portal/);
  assert.doesNotMatch(source, /\b(?:prune|volume rm|container rm|image rm|unlink|rmSync)\b/i);
});

test("PR CI runs the isolated PostgreSQL service and the required checks", async () => {
  const workflow = await readFile(new URL("../.github/workflows/pr-ci.yml", import.meta.url), "utf8");
  assert.match(workflow, /image: postgres:16/);
  assert.match(workflow, /woori_today_portal_test/);
  assert.match(workflow, /TEST_DATABASE_ADMIN_URL/);
  assert.match(workflow, /POSTGRES_USER: postgres/);
  for (const command of ["pnpm test:db", "pnpm test", "pnpm lint", "pnpm exec tsc --noEmit", "pnpm build", "pnpm exec drizzle-kit check", "pnpm audit", "pnpm audit --prod"]) assert.ok(workflow.includes(command), `${command} must run in PR CI`);
});
