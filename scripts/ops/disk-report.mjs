import { spawnSync } from "node:child_process";

const checks = [
  ["Filesystem usage", "df", ["-h", "/"]],
  ["Docker images, containers, and build cache", "docker", ["system", "df", "--verbose"]],
  ["Running and stopped containers with writable-layer sizes", "docker", ["ps", "--all", "--size", "--format", "table {{.Names}}\t{{.Status}}\t{{.Size}}\t{{.Image}}"]],
  ["Images", "docker", ["images", "--format", "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"]],
  ["Volumes (including database volume names; no contents read)", "docker", ["volume", "ls", "--format", "table {{.Name}}\t{{.Driver}}"]],
  ["Protected Portal backup directory usage", "du", ["-sh", "/opt/backups/woori-portal"]],
  ["Latest Portal backup filenames and sizes", "bash", ["-lc", "if [ -d /opt/backups/woori-portal ]; then find /opt/backups/woori-portal -maxdepth 1 -type f -printf '%TY-%Tm-%Td %TH:%TM %s bytes %f\\n' | sort -r | head -10; else printf 'Backup directory unavailable\\n'; fi"]],
];

let failed = false;
for (const [title, command, args] of checks) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 30_000, windowsHide: true });
  console.log(`\n${title}`);
  if (result.error) {
    console.error(`${command} could not run: ${result.error.code ?? "command-error"}`);
    failed = true;
    continue;
  }
  if (result.stdout?.trim()) console.log(result.stdout.trimEnd());
  if (result.stderr?.trim()) console.error(result.stderr.trimEnd());
  if (result.status !== 0) failed = true;
}
console.log("\nRead-only report complete. No images, containers, volumes, caches, or backups were removed.");
if (failed) process.exitCode = 1;
