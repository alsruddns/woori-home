import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAutoPromotion } from "../scripts/deploy/auto-promotion-policy.mjs";

test("automatic promotion allows bounded portal UI and content changes", () => {
  const result = evaluateAutoPromotion({ files: ["src/app/[locale]/world/page.tsx", "src/components/country-card.tsx"], changedLines: 250 });
  assert.equal(result.allowed, true);
  assert.deepEqual(result.reasons, []);
});

test("automatic promotion blocks workflow, migration, data, dependency and runtime policy changes", () => {
  for (const file of [
    ".github/workflows/publish.yml",
    "drizzle/0014_new_table.sql",
    "scripts/data/import-world-bank.mjs",
    "src/data/world-bank.json",
    "src/app/portal-api/finance/crypto/route.ts",
    "src/lib/financial/provider-registry.ts",
    "pnpm-lock.yaml",
    "docker-compose.yml",
    ".env.production",
  ]) {
    const result = evaluateAutoPromotion({ files: [file], changedLines: 1 });
    assert.equal(result.allowed, false, `${file} must require a separately reviewed release`);
  }
});

test("automatic promotion blocks empty and oversized diffs", () => {
  assert.equal(evaluateAutoPromotion({ files: [], changedLines: 0 }).allowed, false);
  assert.equal(evaluateAutoPromotion({ files: ["src/app/page.tsx"], changedLines: 5001 }).allowed, false);
  assert.equal(evaluateAutoPromotion({ files: Array.from({ length: 121 }, (_, index) => `src/app/${index}.tsx`), changedLines: 1 }).allowed, false);
});
