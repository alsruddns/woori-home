import { spawn } from "node:child_process";
import { randomInt } from "node:crypto";
import { open } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseIntegrationTestTarget } from "./integration-test-safety.mjs";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const deleteVolume = args.includes("--delete-volume");
if (args.some((arg) => arg !== "--delete-volume")) {
  console.error("Usage: pnpm test:db [-- --delete-volume]");
  process.exit(2);
}

const run = (command, commandArgs, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, commandArgs, { stdio: "inherit", ...options });
  child.once("error", reject);
  child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with status ${code}`)));
});
const local = !process.env.TEST_DATABASE_URL;
if (deleteVolume && !local) {
  console.error("--delete-volume is available only when this command owns the local Docker Compose test stack.");
  process.exit(2);
}
const project = `woori-test-${process.pid}-${randomInt(100000, 999999)}`;
const compose = ["compose", "-f", "docker-compose.test.yml", "-p", project];
let composeStarted = false;
let exitCode = 0;
let ownedUrl = process.env.TEST_DATABASE_URL;
let localAdminUrl;
let lock;

try {
  if (local) {
    lock = await open(path.join(tmpdir(), "woori-portal-test-db.lock"), "wx");
    const port = String(randomInt(20000, 50000));
    const env = { ...process.env, TEST_PG_PORT: port };
    await run("docker", ["version", "--format", "{{.Server.Version}}"]);
    composeStarted = true;
    await run("docker", [...compose, "up", "-d", "--wait", "postgres"], { env });
    ownedUrl = `postgresql://woori_test:woori_test_local_only@127.0.0.1:${port}/woori_today_portal_test`;
    localAdminUrl = `postgresql://postgres:woori_test_admin_local_only@127.0.0.1:${port}/postgres`;
  }
  parseIntegrationTestTarget(ownedUrl);
  const env = {
    ...process.env,
    TEST_DATABASE_URL: ownedUrl,
    ...(localAdminUrl ? { TEST_DATABASE_ADMIN_URL: localAdminUrl, TEST_DATABASE_PASSWORD: "woori_test_local_only" } : {}),
  };
  await run(process.execPath, ["scripts/db/provision-integration-test-database.mjs"], { env });
  await run(process.execPath, ["scripts/db/prepare-integration-database.mjs"], { env });
  const testEnv = { ...env, DB_TARGET: "test" };
  delete testEnv.TEST_DATABASE_ADMIN_URL;
  delete testEnv.TEST_DATABASE_PASSWORD;
  await run(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["test"], { env: testEnv, shell: process.platform === "win32" });
} catch (error) {
  exitCode = 1;
  console.error(`Database test run failed: ${error instanceof Error ? error.message : "unknown error"}`);
} finally {
  if (composeStarted) {
    try {
      await run("docker", [...compose, "down", "--remove-orphans"]);
      if (deleteVolume) await run("docker", ["volume", "rm", "woori_portal_test_data"]);
    } catch (error) {
      exitCode = 1;
      console.error(`Test container cleanup failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  } else if (deleteVolume) {
    console.error("--delete-volume is available only when this command owns the local Docker Compose test stack.");
    exitCode = 2;
  }
  if (lock) {
    await lock.close();
    const { unlink } = await import("node:fs/promises");
    await unlink(path.join(tmpdir(), "woori-portal-test-db.lock")).catch(() => {});
  }
}
process.exitCode = exitCode;
