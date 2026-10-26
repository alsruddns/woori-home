import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function extractPublishScript(workflow) {
  const lines = workflow.split(/\r?\n/);
  const starts = lines.flatMap((line, index) => /^\s*script:\s*\|\s*$/.test(line) ? [index] : []);
  if (starts.length !== 1) throw new Error(`Expected one Portal SSH script block, found ${starts.length}.`);
  const sourceIndent = lines[starts[0]].match(/^\s*/)[0].length;
  const body = [];
  for (const line of lines.slice(starts[0] + 1)) {
    if (!line.trim()) {
      body.push("");
      continue;
    }
    const indent = line.match(/^\s*/)[0].length;
    if (indent <= sourceIndent) break;
    body.push(line.slice(sourceIndent + 2));
  }
  const script = body.join("\n").trim();
  if (!script.startsWith("set -Eeuo pipefail")) throw new Error("Portal deploy script must start with strict Bash error handling.");
  return script;
}

async function run() {
  const workflow = await readFile(path.join(root, ".github/workflows/publish.yml"), "utf8");
  const script = extractPublishScript(workflow);
  const result = spawnSync("bash", ["-n"], { input: script, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr || "Portal deploy Bash syntax check failed.\n");
    process.exitCode = result.status ?? 1;
    return;
  }
  console.log("Portal SSH deploy script passes bash -n.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : "Portal deploy script validation failed.");
    process.exitCode = 1;
  });
}
