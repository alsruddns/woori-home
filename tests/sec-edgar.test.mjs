import test from "node:test";
import assert from "node:assert/strict";
import { createSecEdgarProvider, normalizeSecCompanyFacts, parseSecCompanyFactsJson, SEC_COMPANIES } from "../src/lib/data-platform/providers/sec-edgar.mjs";
import { createOpenDartProvider } from "../src/lib/data-platform/providers/opendart.mjs";

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
