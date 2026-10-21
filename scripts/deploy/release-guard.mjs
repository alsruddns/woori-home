export const PORTAL_IMAGE = "ghcr.io/alsruddns/woori-home";

export function isMainProductionRelease({ ref, eventName }) {
  return ref === "refs/heads/main" && ["push", "workflow_dispatch"].includes(eventName);
}

export function assertCommitDigest(value) {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value)) {
    throw new Error("Deployment requires a valid immutable sha256 image digest.");
  }
  return value;
}

export function assertCommitShaTag(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{40}$/.test(value)) {
    throw new Error("Image tag must be the full 40-character commit SHA.");
  }
  return value;
}

if (process.argv[1]?.endsWith("release-guard.mjs")) {
  if (!isMainProductionRelease({ ref: process.env.GITHUB_REF, eventName: process.env.GITHUB_EVENT_NAME })) {
    console.error("Production publishing is restricted to main.");
    process.exit(1);
  }
  console.log("Production release ref accepted.");
}
