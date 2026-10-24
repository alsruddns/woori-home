import "../scripts/db/load-env.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { resolveDatabaseTarget } from "../scripts/db/connection-safety.mjs";
import { parseIntegrationTestTarget } from "../scripts/db/integration-test-safety.mjs";

const { Pool } = pg;
const enabled = process.env.DB_TARGET === "test" && Boolean(process.env.TEST_DATABASE_URL);

test("World Bank local DB safety rejects production and remote targets before connecting", () => {
  assert.throws(() => resolveDatabaseTarget({ target: "development", databaseUrl: "postgresql://x:y@remote.example/woori_today_portal_dev" }), /local PostgreSQL host/);
  assert.throws(() => resolveDatabaseTarget({ target: "development", databaseUrl: "postgresql://x:y@localhost/woori_today_portal" }), /restricted to woori_today_portal_dev/);
  assert.throws(() => parseIntegrationTestTarget("postgres://woori_test:pw@remote.example/woori_today_portal_test"), /restricted to woori_today_portal_test/);
  assert.throws(() => parseIntegrationTestTarget("postgres://woori_portal:pw@localhost/woori_today_portal_test"), /dedicated woori_test role/);
  assert.throws(() => parseIntegrationTestTarget("postgres://woori_test:pw@localhost/woori_today_portal"), /restricted to woori_today_portal_test/);
});

test("World Bank database INSERT, SELECT, UPSERT, foreign-key guard and ROLLBACK work in isolated test PostgreSQL", { skip: !enabled && "isolated TEST_DATABASE_URL is not configured; use pnpm test:db" }, async () => {
  const target = parseIntegrationTestTarget(process.env.TEST_DATABASE_URL);
  const pool = new Pool({ connectionString: target.url, max: 1, connectionTimeoutMillis: 4000, allowExitOnIdle: true });
  const client = await pool.connect();
  try {
    const baseline = await client.query(`select value::text from indicator_observations where indicator_id='SL.UEM.TOTL.ZS' and country_iso3='KOR' order by reference_year desc limit 1`);
    assert.equal(baseline.rowCount, 1, "approved World Bank import must exist before DB integration tests");
    const originalValue = baseline.rows[0].value;
    await client.query("begin");
    await client.query(`insert into indicator_observations (indicator_id, country_iso3, reference_year, value, last_checked_at, last_updated_at)
      values ('SL.UEM.TOTL.ZS', 'KOR', 1800, 0, now(), now())`);
    const inserted = await client.query(`select value::text from indicator_observations where indicator_id='SL.UEM.TOTL.ZS' and country_iso3='KOR' and reference_year=1800`);
    assert.equal(inserted.rows[0].value, "0.0000000000");

    const nextValue = (await client.query("select $1::numeric + 1 as value", [originalValue])).rows[0].value.toString();
    const upserted = await client.query(`insert into indicator_observations (indicator_id, country_iso3, reference_year, value, last_checked_at, last_updated_at)
      select 'SL.UEM.TOTL.ZS', 'KOR', reference_year, $1::numeric, now(), now() from indicator_observations
      where indicator_id='SL.UEM.TOTL.ZS' and country_iso3='KOR' order by reference_year desc limit 1
      on conflict (indicator_id, country_iso3, reference_year) do update set value=excluded.value
      where indicator_observations.value is distinct from excluded.value returning value::text`, [nextValue]);
    assert.equal(upserted.rowCount, 1);
    assert.equal(upserted.rows[0].value, nextValue);
    const unchanged = await client.query(`insert into indicator_observations (indicator_id, country_iso3, reference_year, value, last_checked_at, last_updated_at)
      select 'SL.UEM.TOTL.ZS', 'KOR', reference_year, value, now(), now() from indicator_observations
      where indicator_id='SL.UEM.TOTL.ZS' and country_iso3='KOR' order by reference_year desc limit 1
      on conflict (indicator_id, country_iso3, reference_year) do update set value=excluded.value
      where indicator_observations.value is distinct from excluded.value returning value`);
    assert.equal(unchanged.rowCount, 0, "unchanged values must not be updated");

    await client.query("savepoint invalid_country");
    await assert.rejects(client.query(`insert into indicator_observations (indicator_id, country_iso3, reference_year, value, last_checked_at, last_updated_at)
      values ('SL.UEM.TOTL.ZS', 'ZZZ', 1800, 1, now(), now())`), /foreign key/i);
    await client.query("rollback to savepoint invalid_country");
    await client.query("rollback");

    const after = await client.query(`select count(*)::int as count from indicator_observations where indicator_id='SL.UEM.TOTL.ZS' and country_iso3='KOR' and reference_year=1800`);
    assert.equal(after.rows[0].count, 0, "transaction test row must not remain after rollback");
    const restored = await client.query(`select value::text from indicator_observations where indicator_id='SL.UEM.TOTL.ZS' and country_iso3='KOR' order by reference_year desc limit 1`);
    assert.equal(restored.rows[0].value, originalValue, "upsert test must not modify the imported value");
  } finally {
    client.release();
    await pool.end();
  }
});
