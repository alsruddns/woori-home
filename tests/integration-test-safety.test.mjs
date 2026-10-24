import test from "node:test";
import assert from "node:assert/strict";
import { parseIntegrationTestTarget } from "../scripts/db/integration-test-safety.mjs";

test("integration test database accepts only the dedicated local PostgreSQL test target and role", () => {
  assert.deepEqual(parseIntegrationTestTarget("postgresql://woori_test:secret@127.0.0.1:55432/woori_today_portal_test"), {
    database: "woori_today_portal_test",
    host: "127.0.0.1",
    url: "postgresql://woori_test:secret@127.0.0.1:55432/woori_today_portal_test",
  });
  assert.deepEqual(parseIntegrationTestTarget("postgres://woori_test:secret@postgres:5432/woori_today_portal_test").host, "postgres");
  assert.throws(() => parseIntegrationTestTarget("postgres://woori_test:secret@localhost:5432/woori_today_portal"), /restricted/);
  assert.throws(() => parseIntegrationTestTarget("postgres://woori_portal:secret@localhost:5432/woori_today_portal_test"), /dedicated/);
  assert.throws(() => parseIntegrationTestTarget("postgres://woori_test:secret@localhost:5432/woori_today_portal_test?options=drop"), /restricted/);
});
