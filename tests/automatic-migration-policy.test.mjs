import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { evaluateAutomaticMigrations, isAdditiveSchemaOnlySql } from "../scripts/deploy/automatic-migration-policy.mjs";

function setup({ tag = "0014_add_safe_index", sql = "CREATE INDEX IF NOT EXISTS sample_idx ON sample_table (id);", pending = [tag], manifestEntries = null } = {}) {
  const entries = [
    { idx: 0, tag: "0000_init" },
    { idx: 1, tag },
  ];
  const hash = createHash("sha256").update(sql).digest("hex");
  return {
    report: { blockers: [], permissionFindings: [], migrations: { applied: entries.length - pending.length, expected: entries.length, prefixIsValid: true, pending } },
    journal: { entries },
    manifest: { version: 1, migrations: manifestEntries ?? [{ tag, sha256: hash, schemaOnly: true, dataLossRisk: "none", restoreTestRequired: true }] },
    sqlByTag: { [tag]: sql },
  };
}

test("automatic migration policy permits only an exact reviewed, additive schema migration", () => {
  const result = evaluateAutomaticMigrations(setup());
  assert.equal(result.allowed, true);
  assert.equal(result.apply, true);
});

test("automatic migration policy allows a no-op release with no pending migration", () => {
  const result = evaluateAutomaticMigrations(setup({ pending: [], manifestEntries: [] }));
  assert.equal(result.allowed, true);
  assert.equal(result.apply, false);
});

test("automatic migration policy rejects unlisted or checksum-changed migrations", () => {
  assert.equal(evaluateAutomaticMigrations(setup({ manifestEntries: [] })).allowed, false);
  const changed = setup();
  changed.sqlByTag["0014_add_safe_index"] += "-- changed";
  assert.equal(evaluateAutomaticMigrations(changed).allowed, false);
});

test("automatic migration policy blocks current Coinranking identity and rights migrations", () => {
  for (const tag of ["0012_coinranking_asset_identity", "0013_coinranking_snapshot_rights"]) {
    const result = evaluateAutomaticMigrations(setup({ tag }));
    assert.equal(result.allowed, false);
    assert.ok(result.reasons.length > 0);
  }
});

test("the exact reviewed Coinranking schema migrations require empty price tables and a clean XOM identity", async () => {
  const manifest = JSON.parse(await readFile(new URL("../scripts/deploy/automatic-migration-policy.json", import.meta.url), "utf8"));
  const journal = JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
  const sqlByTag = {};
  for (const entry of journal.entries.slice(12)) sqlByTag[entry.tag] = await readFile(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), "utf8");
  const report = {
    blockers: [],
    permissionFindings: [],
    migrations: { applied: 12, expected: 14, prefixIsValid: true, pending: ["0012_coinranking_asset_identity", "0013_coinranking_snapshot_rights"] },
    indexes: [{ indexname: "financial_assets_natural_key_unique_idx" }],
    secIdentityDiagnostic: { rows: [
      { id: "company-xom", cik: "0000034088", ticker: "XOM" },
      { id: "company-related", cik: "0002115436", ticker: "CIK2115436" },
    ] },
    coinranking: { counts: { assets: 0, active_assets: 0, daily_snapshots: 0, duplicate_keys: 0 }, source: null, datasetPresent: false },
  };
  const result = evaluateAutomaticMigrations({ report, journal, manifest, sqlByTag });
  assert.equal(result.allowed, true, result.reasons.join("; "));
  assert.equal(result.apply, true);
  report.coinranking.counts.assets = 1;
  assert.equal(evaluateAutomaticMigrations({ report, journal, manifest, sqlByTag }).allowed, false);
});

test("automatic migration policy blocks data-changing SQL, bad prefixes and database blockers", () => {
  const destructive = evaluateAutomaticMigrations(setup({ sql: "DROP TABLE sample_table;" }));
  assert.equal(destructive.allowed, false);
  assert.match(destructive.reasons.join(" "), /outside the automatic additive-schema allowlist/);
  assert.equal(isAdditiveSchemaOnlySql("ALTER TABLE sample_table ADD COLUMN label text NOT NULL;"), false);
  assert.equal(isAdditiveSchemaOnlySql("UPDATE sample_table SET label='ok';"), false);
  const badPrefix = setup();
  badPrefix.report.migrations.prefixIsValid = false;
  assert.equal(evaluateAutomaticMigrations(badPrefix).allowed, false);
  const blocked = setup();
  blocked.report.blockers.push("xom identity conflict");
  assert.equal(evaluateAutomaticMigrations(blocked).allowed, false);
});
