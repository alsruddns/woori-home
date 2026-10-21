import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeWorldBankSnapshot, decimalString, parseImportArgs } from "../scripts/data/world-bank-import-core.mjs";

const snapshot = JSON.parse(await readFile(new URL("../src/data/world-bank.json", import.meta.url), "utf8"));

test("World Bank import selects only individually reviewed indicators and preserves aggregate identity", () => {
  const result = normalizeWorldBankSnapshot(snapshot);
  assert.equal(result.observations.length, 1090);
  assert.deepEqual([...new Set(result.observations.map((row) => row.indicator))].sort(), ["EG.ELC.ACCS.ZS", "SL.UEM.TOTL.ZS"]);
  assert.equal(result.observations.some((row) => row.country === "WLD"), true);
  assert.equal(result.observations.find((row) => row.country === "WLD").iso2, null);
  assert.equal(result.duplicates, 0);
  assert.equal(result.missing, 0);
});

test("World Bank import filters supported scope and parses explicit CLI options", () => {
  assert.deepEqual(parseImportArgs(["--indicator=EG.ELC.ACCS.ZS", "--country", "kor", "--year-from=2010", "--year-to", "2024", "--dry-run"]), {
    dataset: "world-development-indicators", indicator: "EG.ELC.ACCS.ZS", country: "KOR", yearFrom: 2010, yearTo: 2024, dryRun: true,
  });
  const rows = normalizeWorldBankSnapshot(snapshot, { indicator: "EG.ELC.ACCS.ZS", country: "KOR", yearFrom: 2010, yearTo: 2024 }).observations;
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.country === "KOR" && row.year >= 2010 && row.year <= 2024));
  assert.throws(() => parseImportArgs(["--indicator=SP.POP.TOTL"]), /not approved/);
  assert.throws(() => parseImportArgs(["--country=EUR"]), /Unsupported/);
  assert.throws(() => parseImportArgs(["--year-from=2024", "--year-to=1990"]), /less than or equal/);
});

test("World Bank import rejects malformed keys, years, units, non-finite numbers and conflicting duplicates", () => {
  const copy = structuredClone(snapshot);
  copy.observations.push({ ...copy.observations[0], country: "EUR" });
  assert.throws(() => normalizeWorldBankSnapshot(copy, { indicator: copy.observations[0].indicator }), /Unrecognized country/);
  const badYear = structuredClone(snapshot);
  badYear.observations[0].year = 2201;
  assert.throws(() => normalizeWorldBankSnapshot(badYear, { indicator: badYear.observations[0].indicator }), /Invalid reference year/);
  const badUnit = structuredClone(snapshot);
  badUnit.indicatorMetadata["SL.UEM.TOTL.ZS"].unit = "people";
  assert.throws(() => normalizeWorldBankSnapshot(badUnit, { indicator: "SL.UEM.TOTL.ZS" }), /unexpected unit/);
  assert.throws(() => decimalString(Infinity), /finite/);
  const duplicate = structuredClone(snapshot);
  duplicate.observations.push({ ...duplicate.observations[0], value: duplicate.observations[0].value + 1 });
  assert.throws(() => normalizeWorldBankSnapshot(duplicate, { indicator: duplicate.observations[0].indicator }), /Conflicting duplicate/);
});

test("World Bank numeric normalization preserves zero and negative values and rounds only to NUMERIC(30,10)", () => {
  assert.equal(decimalString(0), "0");
  assert.equal(decimalString(-1.25), "-1.25");
  assert.equal(decimalString(-0.00000000001), "0");
  assert.equal(decimalString(90.6065444946289), "90.6065444946");
  assert.equal(decimalString(0.12345678905), "0.1234567891");
  assert.throws(() => decimalString(1e21), /NUMERIC/);
});

test("World Bank null observations are omitted while measured zero is retained", () => {
  const selected = snapshot.observations.find((row) => row.indicator === "SL.UEM.TOTL.ZS" && row.country === "KOR");
  const copy = structuredClone(snapshot);
  copy.observations = [
    { ...selected, year: 1800, value: null },
    { ...selected, year: 1801, value: 0 },
  ];
  const result = normalizeWorldBankSnapshot(copy, { indicator: "SL.UEM.TOTL.ZS" });
  assert.equal(result.missing, 1);
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].value, "0");
});

test("World Bank DB screen mode defaults to JSON, guards production, stays allowlisted, and fails closed", async () => {
  const [page, route, repository, mode] = await Promise.all([
    readFile(new URL("../src/app/(locale)/[locale]/world-data.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/db/world-bank-comparison-handler.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/db/world-bank-repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/db/world-bank-mode.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(page, /resolveWorldBankDataSource/);
  assert.match(mode, /WORLD_BANK_DATA_SOURCE \?\? "json"/);
  assert.match(mode, /WORLD_BANK_DB_PRODUCTION_ENABLED !== "true"/);
  assert.match(mode, /PRODUCTION_DB_ALLOWED_HOSTS/);
  assert.match(route, /resolveWorldBankDataSource/);
  assert.match(route, /worldBankIndicatorSource\(mode\.source, indicator\.code\)/);
  assert.match(route, /source: "json"/);
  assert.match(route, /World Bank database comparison is unavailable/);
  assert.match(repository, /"SL\.UEM\.TOTL\.ZS", "EG\.ELC\.ACCS\.ZS"/);
  assert.match(repository, /\.limit\(countryIso3\.length \* 401\)/);
});
