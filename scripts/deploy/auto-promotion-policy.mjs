import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHA_PATTERN = /^[a-f0-9]{40}$/;
const MAX_FILES = 120;
const MAX_CHANGED_LINES = 5000;

const blockedPathPatterns = [
  /^\.github\//,
  /^drizzle\//,
  /^scripts\//,
  /^src\/data\//,
  /^src\/app\/(?:api|portal-api)\//,
  /^src\/lib\/(?:db|financial|world-bank|providers|security)(?:\/|$)/,
  /(^|\/)(?:Dockerfile(?:\..*)?|docker-compose(?:\..*)?\.ya?ml|compose(?:\..*)?\.ya?ml)$/i,
  /(^|\/)(?:nginx|infra|migrations?)(\/|$)/i,
  /(^|\/)(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|drizzle\.config\.[^/]+|next\.config\.[^/]+|middleware\.[^/]+|proxy\.[^/]+)$/,
  /\.(?:sql|env|pem|key)$/i,
  /^\.env(?:\.|$)/i,
];

export function evaluateAutoPromotion({ files, changedLines = 0 }) {
  const reasons = [];
  if (!Array.isArray(files) || files.length === 0) reasons.push("The candidate diff is empty or unavailable.");
  if (files.length > MAX_FILES) reasons.push(`The candidate changes ${files.length} files; the automatic limit is ${MAX_FILES}.`);
  if (!Number.isSafeInteger(changedLines) || changedLines < 0 || changedLines > MAX_CHANGED_LINES) {
    reasons.push(`The candidate changes ${changedLines} lines; the automatic limit is ${MAX_CHANGED_LINES}.`);
  }

  const blockedFiles = files.filter((file) => blockedPathPatterns.some((pattern) => pattern.test(file)));
  if (blockedFiles.length) reasons.push(`Sensitive files require a separately reviewed release: ${blockedFiles.join(", ")}`);
  return { allowed: reasons.length === 0, reasons, files: [...files].sort(), changedLines };
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function run() {
  const headSha = process.argv[2] ?? "";
  if (!SHA_PATTERN.test(headSha)) throw new Error("A full 40-character candidate commit SHA is required.");
  git(["merge-base", "--is-ancestor", "origin/main", headSha]);
  const files = git(["diff", "--name-only", `origin/main...${headSha}`]).split(/\r?\n/).filter(Boolean);
  const numstat = git(["diff", "--numstat", `origin/main...${headSha}`]);
  const changedLines = numstat.split(/\r?\n/).filter(Boolean).reduce((total, row) => {
    const [added, removed] = row.split("\t");
    if (added === "-" || removed === "-") return MAX_CHANGED_LINES + 1;
    return total + Number(added) + Number(removed);
  }, 0);
  const result = evaluateAutoPromotion({ files, changedLines });
  console.log(JSON.stringify(result));
  if (!result.allowed) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Automatic promotion policy could not verify this candidate.");
    process.exitCode = 1;
  }
}
