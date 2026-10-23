import test from "node:test";
import assert from "node:assert/strict";
import { createSecEdgarProvider, normalizeSecCompanyFacts, parseSecCompanyFactsJson, SEC_COMPANIES } from "../src/lib/data-platform/providers/sec-edgar.mjs";
import { createOpenDartProvider } from "../src/lib/data-platform/providers/opendart.mjs";
import { parseSecTickerDirectory, SEC_TARGETS } from "../src/lib/data-platform/providers/sec-targets.mjs";
import { collectChangedSecCompanies, persistSecCompanyFacts } from "../scripts/data/sec-company-facts-core.mjs";

const sample = {
  entityName: "Example Corp.",
  facts: { "us-gaap": {
    Revenues: { units: { USD: [
      { val: 1000, start: "2024-01-01", end: "2024-03-31", filed: "2024-05-01", form: "10-Q", fy: 2024, fp: "Q1", accn: "0000000000-24-000001" },
      { val: 900, start: "2024-01-01", end: "2024-03-31", filed: "2024-04-01", form: "10-Q", fy: 2024, fp: "Q1", accn: "0000000000-24-000000" },
      { val: 1, end: "2024-03-31", filed: "2024-05-01", form: "8-K", accn: "0000000000-24-000002" },
    ] } },
    Assets: { units: { USD: [{ val: 5000, end: "2024-03-31", filed: "2024-05-01", form: "10-Q", fy: 2024, fp: "Q1", accn: "0000000000-24-000001" }] } },
  } },
};

test("SEC companyfacts adapter keeps reported USD quarterly/annual facts and filing provenance", () => {
  const normalized = normalizeSecCompanyFacts(sample, SEC_COMPANIES[0], new Date("2024-05-02T00:00:00Z"));
  assert.equal(normalized.company.name, "Example Corp.");
  assert.equal(normalized.facts.length, 3);
  const revenueFacts = normalized.facts.filter((fact) => fact.metric === "revenue");
  const revenue = revenueFacts.find((fact) => fact.value === "1000");
  assert.equal(revenueFacts.length, 2);
  assert.deepEqual([revenue.value, revenue.fiscalYear, revenue.fiscalPeriod, revenue.startDate, revenue.endDate, revenue.filedDate], ["1000", 2024, "Q1", "2024-01-01", "2024-03-31", "2024-05-01"]);
  assert.match(revenue.sourceUrl, /Archives\/edgar\/data\/320193\/000000000024000001\/$/);
  assert.equal(normalized.facts.some((fact) => fact.form === "8-K"), false);
});

test("SEC fact JSON parser preserves decimal digits before JavaScript number coercion", () => {
  const raw = `{"entityName":"Precision Co.","facts":{"us-gaap":{"Assets":{"units":{"USD":[{"val":123456789012345.6789,"end":"2026-06-30","filed":"2026-08-01","form":"10-Q","fy":2026,"fp":"Q2","accn":"0000000001-26-000001"}]}}}}}`;
  const payload = parseSecCompanyFactsJson(raw);
  const facts = normalizeSecCompanyFacts(payload, SEC_COMPANIES[0]);
  assert.equal(facts.facts[0].value, "123456789012345.6789");
});

test("SEC Company Facts includes amendment observations as a separate, attributable filing", () => {
  const amended = structuredClone(sample);
  amended.facts["us-gaap"].NetIncomeLoss = { units: { USD: [
    { val: 120, start: "2024-01-01", end: "2024-03-31", filed: "2024-06-01", form: "10-Q/A", fy: 2024, fp: "Q1", accn: "0000000000-24-000003" },
  ] } };
  const normalized = normalizeSecCompanyFacts(amended, SEC_COMPANIES[0], new Date("2024-06-02T00:00:00Z"));
  const fact = normalized.facts.find((item) => item.form === "10-Q/A");
  assert.equal(fact.value, "120");
  assert.match(fact.sourceUrl, /000000000024000003\/$/);
});

test("SEC adapter requires identifying User-Agent, caches repeated company fetches, and uses HTTP facts", async () => {
  let calls = 0;
  let requestHeaders;
  const provider = createSecEdgarProvider({
    userAgent: "Woori.today tests contact test@example.org",
    wait: async () => {},
    fetchImpl: async (_url, options) => { calls += 1; requestHeaders = options.headers; return Response.json(sample); },
  });
  await provider.fetchCompany(SEC_COMPANIES[0]);
  await provider.fetchCompany(SEC_COMPANIES[0]);
  assert.equal(calls, 1);
  assert.equal(requestHeaders["User-Agent"], "Woori.today tests contact test@example.org");
  assert.throws(() => createSecEdgarProvider({ userAgent: "anonymous" }), { code: "sec-user-agent-missing" });
  await assert.rejects(provider.fetchCompany({ ticker: "BAD", cik: "0000000001" }), /outside the reviewed SEC collection scope/);
});

test("SEC adapter handles rate-limit and HTTP failures without returning fabricated records", async () => {
  const limited = createSecEdgarProvider({ userAgent: "Woori.today tests contact test@example.org", fetchImpl: async () => new Response("", { status: 429, headers: { "retry-after": "2" } }) });
  await assert.rejects(limited.fetchCompany(SEC_COMPANIES[0]), (error) => error.code === "sec-rate-limited" && error.retryAfter === "2");
  const unavailable = createSecEdgarProvider({ userAgent: "Woori.today tests contact test@example.org", fetchImpl: async () => new Response("", { status: 503 }) });
  await assert.rejects(unavailable.fetchCompany(SEC_COMPANIES[0]), (error) => error.code === "sec-http-503");
});

test("SEC directory resolves unique current CIK identities and reports delisted targets individually", () => {
  const targets = [SEC_TARGETS[0], SEC_TARGETS[1]];
  const directory = JSON.stringify({
    fields: ["cik", "name", "ticker", "exchange"],
    data: [[320193, "Apple Inc.", targets[0].ticker, "Nasdaq"]],
  });
  const companies = parseSecTickerDirectory(directory, targets);
  assert.equal(companies.length, 1);
  assert.equal(companies[0].cik, "0000320193");
  assert.deepEqual(companies.unresolvedTargets, [targets[1].ticker]);
  assert.throws(() => parseSecTickerDirectory(JSON.stringify({
    fields: ["cik", "name", "ticker", "exchange"],
    data: [[320193, "Apple Inc.", targets[0].ticker, "Nasdaq"], [320193, "Duplicate", targets[1].ticker, "NYSE"]],
  }), targets), /multiple targets to one CIK/);
});

test("SEC incremental collection skips an unchanged accession and isolates company failures", async () => {
  const companies = [
    { ticker: "AAPL", cik: "0000320193", sector: "information-technology" },
    { ticker: "MSFT", cik: "0000789019", sector: "information-technology" },
  ];
  const provider = {
    async fetchSubmissions(company) {
      if (company.ticker === "MSFT") throw Object.assign(new Error("SEC timeout"), { code: "sec-timeout" });
      return { name: "Apple Inc.", latestFiling: { accessionNumber: "0000320193-26-000100", filedDate: "2026-10-01", form: "10-Q" } };
    },
    async fetchCompany() { throw new Error("unchanged company should not be downloaded"); },
  };
  const result = await collectChangedSecCompanies(provider, companies, new Map([
    ["AAPL", { cik: "0000320193", accessionNumber: "0000320193-26-000100" }],
  ]));
  assert.equal(result.unchanged.length, 1);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].code, "sec-timeout");
});

test("SEC persistence maps normalized facts to database column names and upserts the company set", async () => {
  const statements = [];
  const client = {
    async query(sql, args) {
      statements.push({ sql, args });
      if (sql.includes("insert into financial_companies")) return { rows: [{ id: args[3] === "AAPL" ? "company-aapl" : "company-msft" }] };
      const batch = JSON.parse(args[0]);
      return { rows: batch.map(() => ({ inserted: true })) };
    },
  };
  const snapshot = normalizeSecCompanyFacts(sample, SEC_COMPANIES[0], new Date("2024-05-02T00:00:00Z"));
  snapshot.company.sourceUrl = "https://www.sec.gov/edgar/browse/?CIK=320193";
  const result = await persistSecCompanyFacts(client, {
    updated: [{ ...snapshot, profile: { latestFiling: { accessionNumber: "0000320193-24-000001", filedDate: "2024-05-01", form: "10-Q" } } }],
    unchanged: [{ company: { ...snapshot.company, ticker: "MSFT", cik: "0000789019", sourceUrl: "https://www.sec.gov/edgar/browse/?CIK=789019" }, profile: { latestFiling: { accessionNumber: "0000789019-24-000001", filedDate: "2024-05-01", form: "10-Q" } } }],
  }, { sourceId: "sec-edgar-companyfacts", datasetId: "sec-company-facts" });
  assert.equal(result.companies, 2);
  assert.equal(result.facts, snapshot.facts.length);
  const batch = JSON.parse(statements.find(({ sql }) => sql.includes("jsonb_to_recordset" )).args[0]);
  assert.equal(batch[0].company_id, "company-aapl");
  assert.equal(batch[0].period_key, "2024-01-01");
  assert.equal("companyId" in batch[0], false);
});

test("OpenDART adapter is disabled without its API key and validates periods before fetching", async () => {
  let calls = 0;
  const missing = createOpenDartProvider({ apiKey: "", fetchImpl: async () => { calls += 1; } });
  assert.equal(missing.status, "api-key-missing");
  await assert.rejects(missing.fetchFinancialStatements({ corpCode: "00126380", businessYear: 2025 }), { code: "opendart-api-key-missing" });
  assert.equal(calls, 0);
  const provider = createOpenDartProvider({ apiKey: "test-key", fetchImpl: async (url) => { calls += 1; assert.equal(new URL(url).searchParams.get("crtfc_key"), "test-key"); return Response.json({ status: "000", list: [{ account_nm: "매출액", thstrm_amount: "100" }] }); } });
  assert.equal((await provider.fetchFinancialStatements({ corpCode: "00126380", businessYear: 2025 })).length, 1);
  await assert.rejects(provider.fetchFinancialStatements({ corpCode: "invalid", businessYear: 2025 }), /Invalid OpenDART/);
});
